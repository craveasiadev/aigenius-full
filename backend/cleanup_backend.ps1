# Laravel Backend Cleanup Script
# Removes all non-payment-related files

Write-Host "Cleaning up Laravel backend..." -ForegroundColor Cyan

# Remove controllers
$controllers = @(
    "app/Http/Controllers/AuthController.php",
    "app/Http/Controllers/ChapterController.php",
    "app/Http/Controllers/CustomerController.php",
    "app/Http/Controllers/PageController.php",
    "app/Http/Controllers/PersonalizationController.php",
    "app/Http/Controllers/ProductController.php",
    "app/Http/Controllers/StorybookController.php"
)

foreach ($file in $controllers) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed: $file" -ForegroundColor Green
    }
}

# Remove models
$models = @(
    "app/Models/Chapter.php",
    "app/Models/Child.php",
    "app/Models/Customer.php",
    "app/Models/ImageGenerationJob.php",
    "app/Models/Page.php",
    "app/Models/Personalization.php",
    "app/Models/Product.php",
    "app/Models/Storybook.php",
    "app/Models/User.php"
)

foreach ($file in $models) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed: $file" -ForegroundColor Green
    }
}

# Remove migrations
$migrations = @(
    "database/migrations/0001_01_01_000000_create_users_table.php",
    "database/migrations/0001_01_01_000001_create_cache_table.php",
    "database/migrations/0001_01_01_000002_create_jobs_table.php",
    "database/migrations/2025_10_31_042027_create_storybooks_table.php",
    "database/migrations/2025_11_10_084253_create_customers_table.php",
    "database/migrations/2025_11_10_084317_create_products_table.php",
    "database/migrations/2025_11_10_095224_create_chapters_table.php",
    "database/migrations/2025_11_10_095308_create_personalizations_table.php",
    "database/migrations/2025_11_10_095330_create_pages_table.php",
    "database/migrations/2025_11_19_031023_create_childrens_table.php",
    "database/migrations/2025_11_19_031136_add_column_in_chapters_table.php",
    "database/migrations/2025_11_19_031221_create_image_generation_jobs_table.php",
    "database/migrations/2025_11_19_031814_modify_column_in_personalization_table.php",
    "database/migrations/2025_11_19_034206_create_personal_access_tokens_table.php",
    "database/migrations/2025_11_19_041212_add_last_opened_at_to_chapters_table.php"
)

foreach ($file in $migrations) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed: $file" -ForegroundColor Green
    }
}

Write-Host "Cleanup complete!" -ForegroundColor Green
