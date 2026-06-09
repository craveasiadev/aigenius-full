<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected string $defaultSource = 'wonderstar';

    public function up(): void
    {
        $this->addAppSourceToUsers();
        $this->addAppSourceToTransactions();

        $this->backfillTransactionSources();
        $this->backfillUserSources();

        $this->replaceUserUniqueIndex();
    }

    public function down(): void
    {
        $this->dropIndexIfExists('wpay_users', 'wpay_users_email_app_source_unique', true);
        $this->dropIndexIfExists('wpay_users', 'wpay_users_email_app_source_index');
        $this->dropIndexIfExists('wpay_users', 'wpay_users_app_source_index');
        $this->dropIndexIfExists('wpay_transactions', 'wpay_transactions_app_source_status_index');
        $this->dropIndexIfExists('wpay_transactions', 'wpay_transactions_app_source_index');

        if (Schema::hasTable('wpay_users') && Schema::hasColumn('wpay_users', 'app_source')) {
            Schema::table('wpay_users', function (Blueprint $table): void {
                $table->dropColumn('app_source');
            });
        }

        if (Schema::hasTable('wpay_transactions') && Schema::hasColumn('wpay_transactions', 'app_source')) {
            Schema::table('wpay_transactions', function (Blueprint $table): void {
                $table->dropColumn('app_source');
            });
        }

        // Restore original unique index shape.
        if (Schema::hasTable('wpay_users')) {
            try {
                Schema::table('wpay_users', function (Blueprint $table): void {
                    $table->unique('email', 'wpay_users_email_unique');
                });
            } catch (\Throwable $exception) {
                // Ignore - rollback should remain non-blocking.
            }
        }
    }

    protected function addAppSourceToUsers(): void
    {
        if (!Schema::hasTable('wpay_users')) {
            return;
        }

        // Add column + single-column index (skipped if already present from partial run)
        if (!Schema::hasColumn('wpay_users', 'app_source')) {
            Schema::table('wpay_users', function (Blueprint $table): void {
                $table->string('app_source', 64)->default('wonderstar')->after('email');
                $table->index('app_source', 'wpay_users_app_source_index');
            });
        }

        // Composite index uses email prefix to stay within 1000-byte key limit.
        // email(180) × 4 = 720 + app_source(64) × 4 = 256 = 976 bytes < 1000.
        $this->createIndexIfNotExists(
            'wpay_users',
            'wpay_users_email_app_source_index',
            'CREATE INDEX `wpay_users_email_app_source_index` ON `wpay_users` (`email`(180), `app_source`)'
        );
    }

    protected function addAppSourceToTransactions(): void
    {
        if (!Schema::hasTable('wpay_transactions') || Schema::hasColumn('wpay_transactions', 'app_source')) {
            return;
        }

        Schema::table('wpay_transactions', function (Blueprint $table): void {
            $table->string('app_source', 64)->default('wonderstar')->after('email');
            $table->index('app_source', 'wpay_transactions_app_source_index');
            $table->index(['app_source', 'status'], 'wpay_transactions_app_source_status_index');
        });
    }

    protected function backfillTransactionSources(): void
    {
        if (!Schema::hasTable('wpay_transactions') || !Schema::hasColumn('wpay_transactions', 'app_source')) {
            return;
        }

        DB::table('wpay_transactions')
            ->select(['id', 'order_id', 'metadata'])
            ->orderBy('created_at')
            ->chunk(200, function ($rows): void {
                foreach ($rows as $row) {
                    $metadata = $this->decodeMetadata($row->metadata);
                    $source = $this->normalizeSource($metadata['app_source'] ?? null)
                        ?? $this->inferSourceByOrderId((string) $row->order_id);

                    $metadata['app_source'] = $source;

                    DB::table('wpay_transactions')
                        ->where('id', $row->id)
                        ->update([
                            'app_source' => $source,
                            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        ]);
                }
            });
    }

    protected function backfillUserSources(): void
    {
        if (!Schema::hasTable('wpay_users') || !Schema::hasColumn('wpay_users', 'app_source')) {
            return;
        }

        DB::table('wpay_users')
            ->whereNull('app_source')
            ->orWhere('app_source', '')
            ->update(['app_source' => $this->defaultSource]);

        $sourceByUser = DB::table('wpay_transactions')
            ->select('wpay_user_id', 'app_source', DB::raw('count(*) as tx_count'))
            ->whereNotNull('wpay_user_id')
            ->groupBy('wpay_user_id', 'app_source')
            ->orderByDesc('tx_count')
            ->get()
            ->groupBy('wpay_user_id');

        foreach ($sourceByUser as $userId => $rows) {
            $source = $rows->first()->app_source ?? $this->defaultSource;
            DB::table('wpay_users')
                ->where('id', $userId)
                ->update(['app_source' => $source]);
        }
    }

    protected function replaceUserUniqueIndex(): void
    {
        if (!Schema::hasTable('wpay_users') || !Schema::hasColumn('wpay_users', 'app_source')) {
            return;
        }

        $this->dropIndexIfExists('wpay_users', 'wpay_users_email_unique', true);

        // Unique composite uses email prefix to stay within 1000-byte key limit.
        $this->createIndexIfNotExists(
            'wpay_users',
            'wpay_users_email_app_source_unique',
            'CREATE UNIQUE INDEX `wpay_users_email_app_source_unique` ON `wpay_users` (`email`(180), `app_source`)'
        );
    }

    protected function inferSourceByOrderId(string $orderId): string
    {
        $normalized = strtoupper($orderId);

        if (str_starts_with($normalized, 'TOP-')
            || str_starts_with($normalized, 'WP')
            || str_starts_with($normalized, 'TEST-')
            || str_starts_with($normalized, 'FULLTEST-')) {
            return 'wonderstar';
        }

        return $this->defaultSource;
    }

    protected function normalizeSource(?string $source): ?string
    {
        if (!$source) {
            return null;
        }

        $normalized = strtolower(trim($source));
        $normalized = preg_replace('/[^a-z0-9._-]/', '', $normalized);

        return $normalized !== '' ? $normalized : null;
    }

    /**
     * @return array<string, mixed>
     */
    protected function decodeMetadata(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    protected function createIndexIfNotExists(string $table, string $indexName, string $sql): void
    {
        try {
            $exists = DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$indexName]);
            if (empty($exists)) {
                DB::statement($sql);
            }
        } catch (\Throwable $exception) {
            // Ignore if already present.
        }
    }

    protected function dropIndexIfExists(string $table, string $indexName, bool $unique = false): void
    {
        try {
            Schema::table($table, function (Blueprint $table) use ($indexName, $unique): void {
                if ($unique) {
                    $table->dropUnique($indexName);
                    return;
                }

                $table->dropIndex($indexName);
            });
        } catch (\Throwable $exception) {
            // Ignore missing indexes in partially-migrated environments.
        }
    }
};

