FROM php:8.2-apache

# Enable Apache mod_rewrite for URL routing
RUN a2enmod rewrite

# Install system packages: PostgreSQL client libs + utilities for Composer
RUN apt-get update && apt-get install -y \
    libpq-dev \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PostgreSQL PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql pgsql

# Install Composer globally
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copy application files
COPY . /var/www/html/

# Install PHP dependencies (PHPMailer) via Composer
RUN composer install --working-dir=/var/www/html/backend --no-interaction --no-dev --optimize-autoloader

# Set correct permissions
RUN chown -R www-data:www-data /var/www/html/

# Allow .htaccess overrides (needed for mod_rewrite)
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Expose port 80
EXPOSE 80
