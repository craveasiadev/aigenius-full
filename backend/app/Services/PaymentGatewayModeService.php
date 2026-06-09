<?php

namespace App\Services;

use App\Models\SystemConfig;
use InvalidArgumentException;

class PaymentGatewayModeService
{
    public const CONFIG_KEY = 'payment_gateway_mode';
    public const MODE_PROD = 'prod';
    public const MODE_SANDBOX = 'sandbox';

    /**
     * @return array<int, string>
     */
    public function allowedModes(): array
    {
        return [self::MODE_PROD, self::MODE_SANDBOX];
    }

    public function getMode(): string
    {
        $config = SystemConfig::query()
            ->where('config_key', self::CONFIG_KEY)
            ->first();

        $fallbackMode = (string) env('PAYMENT_GATEWAY_MODE', self::MODE_PROD);
        $raw = $config?->config_value ?? $fallbackMode;

        $mode = $this->normalizeMode($raw);

        return in_array($mode, $this->allowedModes(), true) ? $mode : self::MODE_PROD;
    }

    public function isSandbox(): bool
    {
        return $this->getMode() === self::MODE_SANDBOX;
    }

    public function setMode(string $mode, ?string $updatedBy = null): string
    {
        $normalizedMode = $this->normalizeMode($mode);
        if (!in_array($normalizedMode, $this->allowedModes(), true)) {
            throw new InvalidArgumentException('Unsupported payment gateway mode.');
        }

        SystemConfig::query()->updateOrCreate(
            ['config_key' => self::CONFIG_KEY],
            [
                'config_value' => $normalizedMode,
                'description' => 'Runtime payment gateway mode: prod=fiuu, sandbox=toyyibpay',
                'category' => 'gameplay',
                'data_type' => 'string',
                'default_value' => self::MODE_PROD,
                'updated_at' => now(),
                'updated_by' => $updatedBy,
            ]
        );

        return $normalizedMode;
    }

    /**
     * @param mixed $value
     */
    private function normalizeMode($value): string
    {
        if (is_array($value)) {
            $value = $value['value'] ?? reset($value) ?? '';
        }

        $mode = trim((string) $value);
        if ($mode === '') {
            return self::MODE_PROD;
        }

        // Handle JSON-string values that may be stored in JSON columns (e.g. "\"sandbox\"").
        if (str_starts_with($mode, '"') && str_ends_with($mode, '"')) {
            $decoded = json_decode($mode, true);
            if (is_string($decoded) && $decoded !== '') {
                $mode = $decoded;
            }
        }

        return strtolower($mode);
    }
}

