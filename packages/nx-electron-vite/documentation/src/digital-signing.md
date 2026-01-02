# Digital Signing Applications

Digital signing is a crucial step for distributing Electron applications professionally. It ensures users can trust your application and prevents security warnings during installation.

Starting with `nx-electron-vite` and Electron Builder v26+, the signing configuration has been updated to follow modern standards.

## Windows Signing

The plugin now includes a dedicated signing script for Windows. This is configured in your `electron-builder.yml` under `signtoolOptions`.

### Configuration in `electron-builder.yml`

```yaml
win:
  signtoolOptions:
    publisherName: 'Your Name'
    sign: apps/your-app-electron/src/resources/sign-windows.js
```

### How to use the Signing Script

The generated `sign-windows.js` script (located in the **Electron host project's** `src/resources/` directory) automates the signing process using `signtool.exe`. It looks for specific environment variables to perform the signing:

1.  **`WIN_[GUEST_PROJECT]_PFX_PATH`**: The absolute path to your `.pfx` certificate file OR a base64-encoded string of the certificate content.
2.  **`WIN_[GUEST_PROJECT]_CERT_PASSWD`**: The password for your certificate.

Replace `[GUEST_PROJECT]` with the name of your guest project in uppercase with underscores instead of dashes (e.g., if your project is `my-app`, use `MY_APP`). The generated script automatically looks for these uppercase versions.

### Features of the Script

- **Auto-decoding**: If you provide the certificate as a base64 string (useful for CI/CD like GitHub Actions), the script automatically decodes it to a temporary file.
- **Timestamping**: It attempts to sign with multiple timestamp servers (DigiCert, Sectigo, GlobalSign) to ensure reliability.
- **Fail-safe**: If the environment variables are missing, the script will log a warning but allow the build to continue unsigned (for development).

## macOS Signing

macOS signing and notarization are typically handled via environment variables read directly by `electron-builder`.

- **`APPLE_ID`**: Your Apple ID
- **`APPLE_ID_PASSWORD`**: An app-specific password
- **`APPLE_TEAM_ID`**: Your Team ID

The boilerplate `electron-builder.yml` includes basic settings for entitlements.

## Next Steps

- [Production Builds](/production-builds) for creating distributable applications
- [Generating Icons](/generating-icons) for customizing your application appearance
- [Native Module Integration](/generators/build-native) for advanced functionality
