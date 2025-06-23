# Smoke Tests for nx-electron-vite Plugin

This directory contains comprehensive smoke tests for the nx-electron-vite plugin, organized in a modular structure with **optimized setup** to avoid redundant workspace creation.

## Test Structure

```
smoke-tests/
├── shared/
│   ├── workspace-generator.ts    # Shared utilities for workspace management
│   └── setup.ts                  # Shared workspace setup (runs once)
├── nx-electron-vite/
│   ├── 01-workspace-setup.test.ts      # Verifies workspace structure
│   ├── 02-plugin-init.test.ts          # Tests plugin initialization
│   ├── 03-project-setup.test.ts        # Tests Electron project setup
│   ├── 04-native-modules.test.ts       # Tests native module building
│   ├── 05-icon-generation.test.ts      # Tests icon generation
│   ├── 06-app-building.test.ts         # Tests Electron app building
│   └── 07-integration.test.ts          # Tests complete workflow
├── vitest.setup.ts              # Global setup (runs once)
├── vitest.config.ts            # Vitest configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## Optimized Test Architecture

### **Shared Workspace Setup** ⚡

- **Single Setup**: Workspace is created **once** before all tests run
- **Shared State**: All tests use the same workspace instance
- **No Redundancy**: Eliminates repeated workspace creation and plugin installation
- **Faster Execution**: Dramatically reduces test execution time

### **Test Flow**

1. **Global Setup** (`vitest.setup.ts`): Creates workspace, React app, installs plugin, initializes plugin, creates Electron app
2. **Individual Tests**: Each test only executes its specific commands and verifications
3. **Global Cleanup**: Cleans up workspace after all tests complete

## What Each Test Covers

### 01-workspace-setup.test.ts

- ✅ Verifies workspace structure exists
- ✅ Verifies React guest app is properly configured
- ✅ Verifies Electron app is properly configured
- ✅ Verifies plugin initialization
- ✅ Verifies correct project naming convention

### 02-plugin-init.test.ts

- ✅ Verifies Vite plugin configuration in nx.json
- ✅ Verifies Vite configuration files
- ✅ Tests plugin re-initialization (no duplicates)
- ✅ Verifies Vite configuration structure

### 03-project-setup.test.ts

- ✅ Verifies main files in Electron app
- ✅ Verifies configuration files
- ✅ Verifies package.json and project.json structure
- ✅ Verifies directory structure
- ✅ Verifies TypeScript configuration
- ✅ Verifies automatic naming convention

### 04-native-modules.test.ts

- ✅ Tests build-native generator with **better-sqlite3**
- ✅ Verifies native module directory creation and file placement
- ✅ Tests with multiple packages and custom paths
- ✅ Verifies configuration files
- ✅ **Verifies native module is included in build output**
- ✅ **Tests native module loading in Electron context**
- ✅ **Validates file permissions and binary integrity**

### 05-icon-generation.test.ts

- ✅ Tests build-icons executor
- ✅ Verifies icon file generation in multiple formats
- ✅ Tests platform-specific icons (Windows ICO, macOS ICNS, Linux PNG)
- ✅ Validates electron-builder configuration

### 06-app-building.test.ts

- ✅ Tests build-electron executor
- ✅ Verifies build output structure
- ✅ Tests development and production builds
- ✅ Validates Vite and electron-nx-vite configuration

### 07-integration.test.ts

- ✅ Tests complete end-to-end workflow
- ✅ Tests with different workspace presets
- ✅ Tests with different package managers
- ✅ Comprehensive output verification

## Performance Benefits

### **Before Optimization**

- Each test: ~2-3 minutes setup + test time
- Total time: ~15-20 minutes for all tests
- Redundant workspace creation and plugin installation

### **After Optimization**

- Global setup: ~2-3 minutes (once)
- Each test: ~30 seconds to 2 minutes
- Total time: ~5-8 minutes for all tests
- **60-70% time reduction**

## Running the Tests

```bash
# Install dependencies
pnpm install

# Run all smoke tests (optimized)
pnpm test

# Run specific test file
pnpm test 04-native-modules.test.ts

# Run in watch mode
pnpm test:watch

# Run with UI
pnpm test:ui
```

## Test Configuration

- **Global Setup**: Single workspace creation before all tests
- **Timeout**: 5 minutes per test (300000ms)
- **Global Setup Timeout**: 5 minutes
- **Environment**: Node.js
- **Framework**: Vitest
- **Pool**: Single fork for shared workspace
- **Cleanup**: Automatic cleanup after all tests

## Native Module Testing

The native module tests use **better-sqlite3** as a real-world test case to verify:

1. **Module Installation**: Installs better-sqlite3 package
2. **Native Rebuild**: Rebuilds the module for Electron
3. **File Placement**: Verifies the .node file is placed in the correct location
4. **Binary Integrity**: Checks that the file is a valid binary (not empty)
5. **Build Integration**: Verifies the module is included in the final build
6. **Runtime Loading**: Tests that the module can be loaded in Electron context
7. **Functionality**: Tests basic database operations with the native module

## Notes

- **Shared Workspace**: All tests use the same workspace instance
- **No Redundant Setup**: Workspace creation happens only once
- **Fast Execution**: Tests focus only on their specific functionality
- **Real-time Output**: All commands use `stdio: 'inherit'` for real-time output
- **Comprehensive Verification**: Tests verify both file existence and content structure
- **Native Module Testing**: Includes real functionality verification with better-sqlite3
