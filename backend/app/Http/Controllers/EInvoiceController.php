<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class EInvoiceController extends Controller
{
    /**
     * GET /einvoice/request/{order_id}
     * Show e-invoice request form (returns buyer information form data)
     */
    public function requestForm($order_id)
    {
        try {
            Log::info('[E-Invoice] Request form for order', ['order_id' => $order_id]);

            // Get states from JSON file
            $statesPath = public_path('assets/json/lhdn-states.json');
            if (!File::exists($statesPath)) {
                Log::error('[E-Invoice] States file not found', ['path' => $statesPath]);
                return response()->json([
                    'success' => false,
                    'error' => 'LHDN states configuration file not found'
                ], 500)->header('Access-Control-Allow-Origin', '*')
                  ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                  ->header('Access-Control-Allow-Headers', 'Content-Type, Accept');
            }

            $states = File::get($statesPath);
            $states = collect(json_decode($states, true))->mapWithKeys(function ($state) {
                return [$state['Code'] => $state['State']];
            })->toArray();

            // Fetch order from Supabase shop_orders table
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                Log::error('[E-Invoice] Supabase not configured');
                return response()->json([
                    'success' => false,
                    'error' => 'Supabase not configured'
                ], 500)->header('Access-Control-Allow-Origin', '*')
                  ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                  ->header('Access-Control-Allow-Headers', 'Content-Type, Accept');
            }

            Log::info('[E-Invoice] Fetching order from Supabase', [
                'order_id' => $order_id,
                'url' => "{$supabaseUrl}/rest/v1/shop_orders"
            ]);

            $response = Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/shop_orders", [
                'id' => 'eq.' . $order_id,
                'select' => '*,users!shop_orders_user_id_fkey(name,email,phone)'
            ]);

            Log::info('[E-Invoice] Supabase response', [
                'status' => $response->status(),
                'success' => $response->successful(),
                'data_count' => count($response->json() ?? [])
            ]);

            if (!$response->successful() || empty($response->json())) {
                Log::warning('[E-Invoice] Order not found', [
                    'order_id' => $order_id,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return response()->json([
                    'success' => false,
                    'error' => 'Order not found'
                ], 404)->header('Access-Control-Allow-Origin', '*')
                  ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                  ->header('Access-Control-Allow-Headers', 'Content-Type, Accept');
            }

            $order = $response->json()[0];
            $user = $order['users'] ?? null;

            return response()->json([
                'success' => true,
                'states' => $states,
                'order' => [
                    'id' => $order['id'],
                    'order_number' => $order['order_number'],
                    'total_amount' => $order['total_amount'],
                    'payment_type' => $order['payment_type'] ?? 'payment'
                ],
                'user' => [
                    'name' => $user['name'] ?? '',
                    'email' => $user['email'] ?? '',
                    'phone' => $user['phone'] ?? ''
                ]
            ])->header('Access-Control-Allow-Origin', '*')
              ->header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
              ->header('Access-Control-Allow-Headers', 'Content-Type, Accept');

        } catch (\Exception $e) {
            Log::error('[E-Invoice] Request form error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*');
        }
    }

    /**
     * POST /einvoice/submit/{order_id}
     * Submit e-invoice to LHDN MyInvois
     */
    public function submit(Request $request, $order_id)
    {
        try {
            // Get access token
            if (Cache::has("LHDN_access_token")) {
                $accessToken = Cache::get("LHDN_access_token");
            } else {
                $response = $this->accessTokenLHDN();
                if (!isset($response['httpCode']) || $response['httpCode'] != 200) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Access token failed: ' . json_encode($response)
                    ], 500)->header('Access-Control-Allow-Origin', '*');
                }
                $accessToken = Cache::get("LHDN_access_token");
            }

            // Validate request
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'tin' => 'required|string|max:50',
                'identification_type' => 'required|in:NRIC,BRN',
                'identification_number' => 'required|string|max:50',
                'sst_number' => 'nullable|string|max:50',
                'email' => ['required', 'email:rfc,dns'],
                'contact_number' => ['required', 'string', 'max:20', 'regex:/^\+?[\d\s\-]+$/'],
                'address' => 'required|string|max:500',
                'country' => 'required|string|in:MYS',
                'state' => 'required|string|max:100',
                'postal' => 'required|string|max:10',
                'city' => 'required|string|max:100',
            ]);

            // Fetch order from Supabase
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            $orderResponse = Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/shop_orders", [
                'id' => 'eq.' . $order_id,
                'select' => '*'
            ]);

            if (!$orderResponse->successful() || empty($orderResponse->json())) {
                return response()->json([
                    'success' => false,
                    'error' => 'Order not found'
                ], 404)->header('Access-Control-Allow-Origin', '*');
            }

            $order = $orderResponse->json()[0];

            // Prepare invoice data
            $issueDate = Carbon::now("Asia/Kuala_Lumpur")->toDateString();
            $issueTime = Carbon::now('UTC')->format('H:i:s') . 'Z';

            $companyTin = env('COMPANY_TIN', 'C0000000000');
            $companyBrn = env('COMPANY_BRN', '000000000000');
            $companyName = env('COMPANY_NAME', 'Kiddo Heritage Sdn Bhd');
            $companyAddress = env('COMPANY_ADDRESS', 'The Shore Shopping Gallery, Melaka Malaysia');
            $companyCity = env('COMPANY_CITY', 'Melaka');
            $companyPostcode = env('COMPANY_POSTCODE', '75200');
            $companyState = env('COMPANY_STATE', '04'); // Melaka
            $companyPhone = env('COMPANY_PHONE', '+60128789169');
            $companyEmail = env('COMPANY_EMAIL', 'info@wonderpark.my');

            $invoiceData = [
                "_D" => "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
                "_A" => "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
                "_B" => "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
                "Invoice" => [
                    [
                        "ID" => [
                            ["_" => $order['order_number']]
                        ],
                        "IssueDate" => [
                            ["_" => $issueDate]
                        ],
                        "IssueTime" => [
                            ["_" => $issueTime]
                        ],
                        "InvoiceTypeCode" => [
                            ["_" => "01", "listVersionID" => "1.0"]
                        ],
                        "DocumentCurrencyCode" => [
                            ["_" => "MYR"]
                        ],
                        "TaxCurrencyCode" => [
                            ["_" => "MYR"]
                        ],
                        "AccountingSupplierParty" => [
                            [
                                "Party" => [
                                    [
                                        "IndustryClassificationCode" => [
                                            [
                                                "_" => "85499",
                                                "name" => "Restaurants and mobile food service activities"
                                            ]
                                        ],
                                        "PartyIdentification" => [
                                            ["ID" => [["_" => $companyTin, "schemeID" => "TIN"]]],
                                            ["ID" => [["_" => $companyBrn, "schemeID" => "BRN"]]]
                                        ],
                                        "PostalAddress" => [
                                            [
                                                "CityName" => [["_" => $companyCity]],
                                                "PostalZone" => [["_" => $companyPostcode]],
                                                "CountrySubentityCode" => [["_" => $companyState]],
                                                "AddressLine" => [
                                                    ["Line" => [["_" => $companyAddress]]],
                                                ],
                                                "Country" => [
                                                    [
                                                        "IdentificationCode" => [
                                                            ["_" => "MYS", "listID" => "ISO3166-1", "listAgencyID" => "6"]
                                                        ]
                                                    ]
                                                ]
                                            ]
                                        ],
                                        "PartyLegalEntity" => [
                                            ["RegistrationName" => [["_" => $companyName]]]
                                        ],
                                        "Contact" => [
                                            [
                                                "Telephone" => [["_" => $companyPhone]],
                                                "ElectronicMail" => [["_" => $companyEmail]]
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        "AccountingCustomerParty" => [
                            [
                                "Party" => [
                                    [
                                        "PostalAddress" => [
                                            [
                                                "CityName" => [["_" => $validated['city']]],
                                                "PostalZone" => [["_" => $validated['postal']]],
                                                "CountrySubentityCode" => [["_" => $validated['state']]],
                                                "AddressLine" => [
                                                    ["Line" => [["_" => $validated['address']]]],
                                                ],
                                                "Country" => [
                                                    [
                                                        "IdentificationCode" => [
                                                            ["_" => $validated['country']]
                                                        ]
                                                    ]
                                                ]
                                            ]
                                        ],
                                        "PartyLegalEntity" => [
                                            ["RegistrationName" => [["_" => $validated['name']]]]
                                        ],
                                        "PartyIdentification" => [
                                            ["ID" => [["_" => $validated['tin'], "schemeID" => "TIN"]]],
                                            ["ID" => [["_" => $validated['identification_number'], "schemeID" => $validated['identification_type']]]]
                                        ],
                                        "Contact" => [
                                            [
                                                "Telephone" => [["_" => $validated['contact_number']]],
                                                "ElectronicMail" => [["_" => $validated['email']]]
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        "TaxTotal" => [
                            [
                                "TaxAmount" => [
                                    ["_" => 0.00, "currencyID" => "MYR"]
                                ],
                                "TaxSubtotal" => [
                                    [
                                        "TaxableAmount" => [["_" => round($order['total_amount'], 2), "currencyID" => "MYR"]],
                                        "TaxAmount" => [["_" => 0.00, "currencyID" => "MYR"]],
                                        "TaxCategory" => [
                                            [
                                                "ID" => [["_" => "01"]],
                                                "TaxScheme" => [
                                                    [
                                                        "ID" => [
                                                            ["_" => "OTH", "schemeID" => "UN/ECE 5153", "schemeAgencyID" => "6"]
                                                        ]
                                                    ]
                                                ]
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        "LegalMonetaryTotal" => [
                            [
                                "LineExtensionAmount" => [["_" => round($order['subtotal'] ?? $order['total_amount'], 2), "currencyID" => "MYR"]],
                                "TaxExclusiveAmount" => [["_" => round($order['total_amount'], 2), "currencyID" => "MYR"]],
                                "TaxInclusiveAmount" => [["_" => round($order['total_amount'], 2), "currencyID" => "MYR"]],
                                "AllowanceTotalAmount" => [["_" => round($order['discount_amount'] ?? 0, 2), "currencyID" => "MYR"]],
                                "PayableAmount" => [["_" => round($order['total_amount'], 2), "currencyID" => "MYR"]]
                            ]
                        ],
                    ]
                ]
            ];

            // Add optional SST number
            if (!empty($validated['sst_number'])) {
                $invoiceData["Invoice"][0]["AccountingCustomerParty"][0]["Party"][0]["PartyIdentification"][] = [
                    "ID" => [["_" => $validated['sst_number'], "schemeID" => "SST"]]
                ];
            }

            // Build invoice line items
            $invoiceLineItems = [];
            $items = $order['items'] ?? [];

            if ($order['payment_type'] === 'topup') {
                // For topups, create a single line item
                $amount = round($order['total_amount'], 2);
                $invoiceLineItems[] = [
                    "ID" => [["_" => "1"]],
                    "InvoicedQuantity" => [["_" => 1, "unitCode" => "C62"]],
                    "LineExtensionAmount" => [["_" => $amount, "currencyID" => "MYR"]],
                    "TaxTotal" => [[
                        "TaxAmount" => [["_" => 0.00, "currencyID" => "MYR"]],
                        "TaxSubtotal" => [[
                            "TaxableAmount" => [["_" => $amount, "currencyID" => "MYR"]],
                            "TaxAmount" => [["_" => 0.00, "currencyID" => "MYR"]],
                            "Percent" => [["_" => 0]],
                            "TaxCategory" => [[
                                "ID" => [["_" => "01"]],
                                "TaxScheme" => [[
                                    "ID" => [
                                        ["_" => "OTH", "schemeID" => "UN/ECE 5153", "schemeAgencyID" => "6"]
                                    ]
                                ]]
                            ]]
                        ]]
                    ]],
                    "Item" => [[
                        "CommodityClassification" => [
                            [
                                "ItemClassificationCode" => [
                                    ["_" => "022", "listID" => "CLASS"]
                                ]
                            ]
                        ],
                        "Description" => [["_" => "Wallet Top-up - RM" . number_format($amount, 2)]],
                        "OriginCountry" => [
                            ["IdentificationCode" => [["_" => "MYS"]]]
                        ]
                    ]],
                    "Price" => [[
                        "PriceAmount" => [["_" => $amount, "currencyID" => "MYR"]]
                    ]],
                    "ItemPriceExtension" => [[
                        "Amount" => [["_" => $amount, "currencyID" => "MYR"]]
                    ]]
                ];
            } else {
                // For checkout orders, list items
                foreach ($items as $index => $item) {
                    $lineID = $index + 1;
                    $productName = $item['product_name'] ?? 'Product';
                    $quantity = $item['quantity'] ?? 1;
                    $unitPrice = round($item['unit_price'] ?? 0, 2);
                    $total = round($item['total_price'] ?? ($quantity * $unitPrice), 2);

                    $invoiceLineItems[] = [
                        "ID" => [["_" => (string)$lineID]],
                        "InvoicedQuantity" => [["_" => $quantity, "unitCode" => "C62"]],
                        "LineExtensionAmount" => [["_" => $total, "currencyID" => "MYR"]],
                        "TaxTotal" => [[
                            "TaxAmount" => [["_" => 0.00, "currencyID" => "MYR"]],
                            "TaxSubtotal" => [[
                                "TaxableAmount" => [["_" => $total, "currencyID" => "MYR"]],
                                "TaxAmount" => [["_" => 0.00, "currencyID" => "MYR"]],
                                "Percent" => [["_" => 0]],
                                "TaxCategory" => [[
                                    "ID" => [["_" => "01"]],
                                    "TaxScheme" => [[
                                        "ID" => [
                                            ["_" => "OTH", "schemeID" => "UN/ECE 5153", "schemeAgencyID" => "6"]
                                        ]
                                    ]]
                                ]]
                            ]]
                        ]],
                        "Item" => [[
                            "CommodityClassification" => [
                                [
                                    "ItemClassificationCode" => [
                                        ["_" => "022", "listID" => "CLASS"]
                                    ]
                                ]
                            ],
                            "Description" => [["_" => $productName]],
                            "OriginCountry" => [
                                ["IdentificationCode" => [["_" => "MYS"]]]
                            ]
                        ]],
                        "Price" => [[
                            "PriceAmount" => [["_" => $unitPrice, "currencyID" => "MYR"]]
                        ]],
                        "ItemPriceExtension" => [[
                            "Amount" => [["_" => $total, "currencyID" => "MYR"]]
                        ]]
                    ];
                }
            }

            $invoiceData["Invoice"][0]["InvoiceLine"] = $invoiceLineItems;

            // Log the invoice data structure BEFORE encoding
            Log::info('[E-Invoice] Invoice data structure', [
                'order_id' => $order_id,
                'invoice_data' => $invoiceData
            ]);

            // Encode and hash the document
            $invoiceJson = json_encode($invoiceData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $base64Document = base64_encode($invoiceJson);
            $documentHash = hash('sha256', $invoiceJson);

            // Log the full invoice structure for debugging
            Log::info('[E-Invoice] Full invoice JSON', [
                'order_id' => $order_id,
                'invoice_json' => $invoiceJson
            ]);

            $data = [
                "documents" => [
                    [
                        "format" => "JSON",
                        "document" => $base64Document,
                        "documentHash" => $documentHash,
                        "codeNumber" => $order['order_number'],
                    ]
                ]
            ];

            // Log the final submission data structure
            Log::info('[E-Invoice] Submission data', [
                'order_id' => $order_id,
                'data' => $data
            ]);

            // Submit to LHDN
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => env('LHDN_BASEURL') . "/api/v1.0/documentsubmissions",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => "POST",
                CURLOPT_POSTFIELDS => json_encode($data),
                CURLOPT_HTTPHEADER => [
                    "Content-Type: application/json",
                    "Accept: application/json",
                    "Authorization: Bearer " . $accessToken,
                ],
            ]);

            $response = curl_exec($curl);
            if (curl_errno($curl)) {
                throw new \Exception('Curl error: ' . curl_error($curl));
            }
            curl_close($curl);
            $response = json_decode($response, true);

            if (isset($response['acceptedDocuments']) && !empty($response['acceptedDocuments'])) {
                $lhdnUuid = $response["acceptedDocuments"][0]["uuid"];

                // Update shop_order in Supabase with LHDN UUID
                Http::withHeaders([
                    'apikey' => $supabaseKey,
                    'Authorization' => 'Bearer ' . $supabaseKey,
                    'Content-Type' => 'application/json',
                    'Prefer' => 'return=minimal'
                ])->patch("{$supabaseUrl}/rest/v1/shop_orders?id=eq.{$order_id}", [
                    'lhdn_uuid' => $lhdnUuid,
                    'updated_at' => now()->toIso8601String()
                ]);

                Log::info('[E-Invoice] Successfully submitted', [
                    'order_id' => $order_id,
                    'order_number' => $order['order_number'],
                    'lhdn_uuid' => $lhdnUuid
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'E-Invoice submitted successfully!',
                    'lhdn_uuid' => $lhdnUuid
                ])->header('Access-Control-Allow-Origin', '*')
                  ->header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                  ->header('Access-Control-Allow-Headers', 'Content-Type, Accept');
            } else {
                Log::error('[E-Invoice] Submission failed', ['response' => $response]);
                return response()->json([
                    'success' => false,
                    'error' => 'Submission failed: ' . json_encode($response)
                ], 400)->header('Access-Control-Allow-Origin', '*');
            }

        } catch (\Exception $e) {
            Log::error('[E-Invoice] Submit error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*');
        }
    }

    /**
     * GET /einvoice/qr/{lhdn_uuid}
     * Generate QR code for viewing e-invoice on LHDN portal
     */
    public function generateQRCode($lhdn_uuid)
    {
        try {
            // LHDN QR format: URL to view the invoice
            $qrData = "https://myinvois.hasil.gov.my/{$lhdn_uuid}";

            return response()->json([
                'success' => true,
                'qr_data' => $qrData,
                'lhdn_uuid' => $lhdn_uuid
            ])->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500)->header('Access-Control-Allow-Origin', '*');
        }
    }

    /**
     * Get LHDN access token
     */
    private function accessTokenLHDN()
    {
        $data = [
            "client_id" => env('CLIENT_ID'),
            "client_secret" => env('CLIENT_SECRET'),
            "grant_type" => "client_credentials",
            "scope" => "InvoicingAPI",
        ];

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => env('LHDN_BASEURL') . "/connect/token",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => http_build_query($data),
            CURLOPT_HTTPHEADER => [
                "Content-Type: application/x-www-form-urlencoded",
                "Accept: application/json",
            ],
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if (curl_errno($curl)) {
            throw new \Exception('Curl error: ' . curl_error($curl));
        }
        curl_close($curl);
        $response = json_decode($response, true);

        if (isset($response["access_token"]) && $response["access_token"]) {
            Cache::put("LHDN_access_token", $response["access_token"], Carbon::now("Asia/Kuala_Lumpur")->addMinutes(60));
            $response["httpCode"] = $httpCode;
        }
        return $response;
    }
}
