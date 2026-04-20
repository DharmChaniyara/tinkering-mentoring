FROM php:8.2-apache

# Enable Apache mod_rewrite for URL routing
RUN a2enmod rewrite

# Install required system packages and PHP extensions
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PostgreSQL extensions for PHP (PDO and regular pgsql)
RUN docker-php-ext-install pdo pdo_pgsql pgsql

# Copy application files to the document root
COPY . /var/www/html/

# Update permissions
RUN chown -R www-data:www-data /var/www/html/

# Expose port 80
EXPOSE 80
