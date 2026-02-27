# YayBoost - WooCommerce Conversion Optimization

**Version:** 1.0.0
**License:** GPL v2 or later
**Author:** YayCommerce

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yaycommerce/yayboost)
[![WordPress](https://img.shields.io/badge/WordPress-5.8%2B-blue.svg)](https://wordpress.org/)
[![WooCommerce](https://img.shields.io/badge/WooCommerce-6.0%2B-purple.svg)](https://woocommerce.com/)
[![PHP](https://img.shields.io/badge/PHP-7.4%2B-777BB4.svg)](https://php.net/)
[![License](https://img.shields.io/badge/license-GPL--2.0%2B-green.svg)](https://www.gnu.org/licenses/gpl-2.0.html)

**Boost your WooCommerce sales with intelligent features and recommendations**

YayBoost is a modular WordPress plugin that provides powerful conversion optimization features for WooCommerce stores. Built with modern architecture and best practices, it offers a flexible system for adding and managing sales-boosting features.

---

## 🚀 Features

### Coming Soon

- Product Recommendations
- Cross-sell & Upsell Engine
- Smart Product Bundles
- Conversion Analytics
- A/B Testing Framework

---

## 📋 Requirements

- **WordPress**: 6.0 or higher
- **PHP**: 7.4 or higher
- **WooCommerce**: 10.0 or higher (tested up to 10.4.3)
- **Node.js**: 18+ (for development)
- **pnpm**: Latest version (for development)

---

## 💾 Installation

### From WordPress Admin

1. Download the plugin zip file
2. Navigate to **Plugins > Add New > Upload Plugin**
3. Choose the downloaded zip file and click **Install Now**
4. Click **Activate Plugin**

### Manual Installation

1. Upload the `yayboost` folder to `/wp-content/plugins/`
2. Activate the plugin through the **Plugins** menu in WordPress
3. Navigate to **YayCommerce > YayBoost** to configure features

### Via Composer

```bash
composer require yaycommerce/yayboost
```

---

## 🛠️ Development Setup

### Prerequisites

Ensure you have the following installed:
- PHP 7.4+ with Composer
- Node.js 18+ and pnpm
- Local WordPress development environment

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yaycommerce/yayboost.git
   cd yayboost
   ```

2. **Install PHP dependencies**
   ```bash
   composer install
   ```

3. **Install JavaScript dependencies**
   ```bash
   cd apps/admin-settings
   pnpm install
   ```

4. **Enable development mode**
   
   Create a `wp-config.php` constant or ensure `vite.config.ts` exists in `apps/admin-settings/`:
   ```php
   define('YAYBOOST_IS_DEVELOPMENT', true);
   ```

5. **Start development server**
   ```bash
   cd apps/admin-settings
   pnpm dev
   ```
   
   The Vite dev server will run on `http://localhost:3000`

### Building for Production

```bash
cd apps/admin-settings
pnpm build
```

Compiled assets will be output to `assets/dist/`

### Quick Start Script

Use the provided convenience script:
```bash
./run.sh dev-init   # Install all dependencies
./run.sh dev        # Start development mode
./run.sh build      # Build production assets
./run.sh test       # Run tests
./run.sh release    # Build and create release zip
./run.sh help       # Show all commands
```

### Creating a Release

To build a distribution-ready plugin package:

```bash
./release.sh
```

This will:
- Install production dependencies
- Build frontend assets
- Create a clean plugin copy
- Generate a zip file in `release/yayboost-sales-booster-for-woocommerce-{version}.zip`
- Create a SHA-256 checksum

For detailed release instructions, see [RELEASE.md](RELEASE.md).

---

## 🏗️ Architecture

YayBoost is built with a modern, maintainable architecture:

### Core Components

```
yayboost-sales-booster-for-woocommerce/
├── includes/
│   ├── Bootstrap.php              # Main plugin initialization
│   ├── ServiceProvider.php        # Service registration
│   ├── Container/                 # Dependency Injection Container
│   ├── Features/                  # Feature modules
│   │   ├── AbstractFeature.php    # Base feature class
│   │   └── SampleBoost/           # Feature implementations
│   ├── API/                       # REST API endpoints
│   │   ├── Router.php             # API route registration
│   │   └── Controllers/           # API controllers
│   ├── Admin/                     # WordPress admin integration
│   ├── Utils/                     # Utility classes
│   └── Interfaces/                # PHP interfaces
├── apps/
│   └── admin-settings/            # React admin interface
│       ├── src/                   # React components
│       └── vite.config.ts         # Vite configuration
└── vendor/                        # Composer dependencies
```

### Design Patterns

- **Dependency Injection**: Clean dependency management with DI Container
- **Service Provider Pattern**: Modular service registration and bootstrapping
- **Abstract Factory**: Feature creation and initialization
- **Registry Pattern**: Feature and settings management
- **Repository Pattern**: Data access abstraction (coming soon)

### Feature System

Each feature extends `AbstractFeature` and implements `FeatureInterface`:

```php
class MyFeature extends AbstractFeature {
    protected $id = 'my_feature';
    protected $name = 'My Feature';
    protected $description = 'Feature description';
    
    public function init() {
        // Initialize feature hooks and functionality
    }
}
```

Features can be enabled/disabled through the admin interface and have their own settings management.

---

## 🔌 REST API

YayBoost provides a REST API for managing features and settings:

### Base URL
```
https://yoursite.com/wp-json/yayboost/v1
```

### Endpoints

#### Features

- **GET** `/features` - Get all features
- **GET** `/features/{id}` - Get specific feature
- **PUT** `/features/{id}` - Update feature status
- **PUT** `/features/{id}/settings` - Update feature settings

#### Settings

- **GET** `/settings` - Get plugin settings
- **PUT** `/settings` - Update plugin settings

### Example Request

```bash
curl -X GET https://yoursite.com/wp-json/yayboost/v1/features \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎨 Frontend React App

The admin interface is built with modern React and Vite:

### Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Ant Design** - UI component library
- **Redux** - State management (being migrated to Zustand)

### File Structure

```
apps/admin-settings/
├── src/
│   ├── components/           # React components
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # App entry point
│   └── styles/              # CSS styles
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies
```

---

## 🧪 Testing

### PHP Tests

```bash
composer test
```

### JavaScript Tests

```bash
cd apps/admin-settings
pnpm test
```

---

## 📖 Creating a New Feature

1. **Create feature class**
   ```php
   namespace YayBoost\Features\MyFeature;
   
   use YayBoost\Features\AbstractFeature;
   
   class MyFeature extends AbstractFeature {
       protected $id = 'my_feature';
       protected $name = 'My Feature';
       protected $description = 'Description here';
       
       public function init() {
           // Add WordPress hooks
           add_action('wp_footer', [$this, 'render_feature']);
       }
       
       public function render_feature() {
           // Feature implementation
       }
       
       protected function get_default_settings() {
           return array_merge(parent::get_default_settings(), [
               'custom_setting' => 'default_value',
           ]);
       }
   }
   ```

2. **Register in ServiceProvider**
   ```php
   protected function register_features(Container $container) {
       $container->register('feature.my_feature', function($c) {
           return new MyFeature\MyFeature($c);
       });
       $this->features[] = 'feature.my_feature';
   }
   ```

3. **Feature is now available in admin interface!**

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow coding standards:
   - PHP: snake_case for functions, PascalCase for classes
   - JavaScript/TypeScript: camelCase for functions, PascalCase for components
4. Write tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- **PHP**: Follow WordPress PHP Coding Standards
- **JavaScript**: Follow Airbnb JavaScript Style Guide
- **TypeScript**: Strict mode enabled
- **Commits**: Use conventional commits format

---

## 📝 License

This project is licensed under the GPL v2 or later - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Credits

**YayBoost** is developed and maintained by [YayCommerce](https://yaycommerce.com)

### Contributors

- Development Team
- Community Contributors

---

## 📞 Support

- **Documentation**: [https://docs.yaycommerce.com/yayboost](https://docs.yaycommerce.com/yayboost)
- **Support Forum**: [https://wordpress.org/support/plugin/yayboost](https://wordpress.org/support/plugin/yayboost)
- **Issue Tracker**: [https://github.com/yaycommerce/yayboost/issues](https://github.com/yaycommerce/yayboost/issues)
- **Email**: support@yaycommerce.com

---

## 🗺️ Roadmap

### Phase 1: Core Architecture ✅
- DI Container
- Service Provider system
- Feature registry
- REST API foundation
- Admin interface base

### Phase 2: Essential Features (In Progress)
- Recently Viewed Products ✅
- Product Recommendations
- Cross-sell Engine
- Analytics Dashboard

### Phase 3: Advanced Features
- A/B Testing Framework
- Smart Bundles
- Dynamic Pricing Integration
- Email Marketing Integration

### Phase 4: Enterprise Features
- Multi-site Support
- Advanced Analytics
- Performance Optimization
- White-label Options

---

## 💖 Show Your Support

If you find YayBoost helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 📝 Contributing code or documentation
- ☕ [Buy us a coffee](https://yaycommerce.com/donate)

---

**Made with ❤️ by YayCommerce**

