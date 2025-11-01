# Ενοικιάσεις Πειραιάς 🚗

**Professional Contract Management App for Vehicle Rentals**

A comprehensive React Native application built with Expo for managing vehicle rental contracts in Piraeus, Greece.

## 🌟 Features

### 📋 Contract Management
- **Create & Edit Contracts**: Complete rental agreement management
- **Digital Signatures**: Capture signatures from both parties
- **PDF Generation**: Professional contract documents with embedded signatures
- **Contract History**: Track and search all rental agreements

### 👤 User Management
- **Multiple Users**: Support for different managers
- **Individual Signatures**: Personal signature for each user
- **User Profiles**: Complete user information management

### 📸 Vehicle Documentation
- **Interactive Car Diagram**: Mark damage locations visually
- **Photo Capture**: Document vehicle condition with photos
- **Damage Tracking**: Comprehensive damage documentation

### 📄 Professional Output
- **PDF Contracts**: Legal-compliant document generation
- **Embedded Signatures**: Digital signatures in PDFs
- **Professional Formatting**: Clean, business-ready documents

## 🚀 Technology Stack

- **React Native** with Expo SDK 54
- **TypeScript** for type safety
- **Expo Router** for navigation
- **React Native SVG** for signature capture
- **Expo FileSystem** for local storage
- **Expo Print** for PDF generation
- **React Native Safe Area Context** for proper layouts

## 📱 Screenshots

*Screenshots will be added after deployment*

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Supabase account (free: https://supabase.com)
- iOS Simulator or Android Emulator (optional)

### Quick Setup (5 Minutes)

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/fotisconctacts.git
   cd fotisconctacts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Supabase** (See detailed guides below)
   - [Quick Start Guide](QUICK_START_SUPABASE.md) - 5 minute setup
   - [Complete Setup Instructions](SETUP_INSTRUCTIONS.md) - Detailed guide
   - [Setup Checklist](SUPABASE_SETUP_CHECKLIST.md) - Step-by-step checklist

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Scan QR code with Expo Go app
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## 📦 Deployment

### Expo Snack (Quick Demo)
- Visit [snack.expo.dev](https://snack.expo.dev)
- Import project files
- Share instantly

### App Stores (Production)
- Configure EAS Build
- Build for iOS/Android
- Submit to App Store/Google Play

## 🎯 Key Features Working

✅ **Signature Capture**: Perfect signature drawing and preview  
✅ **Contract Management**: Complete CRUD operations  
✅ **PDF Generation**: Professional document creation  
✅ **User Management**: Multi-user support  
✅ **Vehicle Documentation**: Interactive car diagram  
✅ **Local Storage**: Secure data persistence  

## 📋 Project Structure

```
fotisconctacts/
├── app/                    # Main app screens
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Contract list
│   ├── new-contract.tsx   # Create contract
│   ├── contract-details.tsx # View contract
│   ├── edit-contract.tsx  # Edit contract
│   └── user-management.tsx # User management
├── components/            # Reusable components
│   ├── signature-pad.tsx # Signature capture
│   ├── car-diagram.tsx   # Vehicle diagram
│   ├── image-modal.tsx   # Image display
│   └── photo-capture.tsx # Photo capture
├── services/             # Business logic
│   ├── contract-storage.service.ts
│   ├── user-storage.service.ts
│   └── pdf-generation.service.ts
├── models/               # TypeScript interfaces
│   ├── contract.interface.ts
│   └── damage.interface.ts
├── utils/                # Utility functions
│   ├── date-conversion.util.ts
│   └── file-naming.util.ts
└── assets/               # Images and icons
```

## 🔧 Configuration

### App Configuration (`app.json`)
- **Bundle ID**: `com.fotis.contracts`
- **Project ID**: `fotisconctacts-2024`
- **Platforms**: iOS, Android, Web

### EAS Build (`eas.json`)
- Production builds configured
- App store deployment ready

## 📄 Documentation

### Setup Guides
- [Quick Start Supabase](QUICK_START_SUPABASE.md) - Get started in 5 minutes
- [Complete Setup Instructions](SETUP_INSTRUCTIONS.md) - Detailed walkthrough
- [Setup Checklist](SUPABASE_SETUP_CHECKLIST.md) - Step-by-step checklist
- [Supabase Integration](supabase/README.md) - Full Supabase documentation

### Deployment
- [Android Build Guide](ANDROID_BUILD_GUIDE.md) - Build APK for Android
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - App store deployment
- [App Store Description](APP_STORE_DESCRIPTION.md) - Store listing info
- [Privacy Policy](PRIVACY_POLICY.md) - Privacy policy document

## 🤝 Contributing

This is a private project for vehicle rental management in Piraeus, Greece.

## 📞 Support

For support or questions about this application, please contact:
- **Email**: support@fotiscontracts.com
- **Phone**: +30 XXX XXX XXXX

## 📄 License

This project is proprietary software for vehicle rental management.

---

**Built with ❤️ for the vehicle rental industry in Piraeus, Greece**