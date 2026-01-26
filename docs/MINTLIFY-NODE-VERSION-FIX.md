# Mintlify Node.js Version Issue - Fix Guide

**Issue**: Mintlify CLI doesn't support Node.js v25+. Current version: v25.3.0

**Error**: `mint dev is not supported on node versions 25+. Please downgrade to an LTS node version.`

---

## Solution Options

### Option 1: Use Node Version Manager (Recommended)

Install and use Node.js LTS (v20.x or v22.x):

#### Using NVM (Node Version Manager for Windows)

1. **Install NVM for Windows**:
   ```powershell
   # Download from: https://github.com/coreybutler/nvm-windows/releases
   # Or use winget:
   winget install CoreyButler.NVMforWindows
   ```

2. **Install Node.js LTS**:
   ```powershell
   nvm install 20.11.0
   nvm use 20.11.0
   ```

3. **Verify version**:
   ```powershell
   node --version  # Should show v20.x.x
   ```

4. **Run Mintlify**:
   ```powershell
   cd docs
   mint dev --port 3333
   ```

#### Using Volta (Alternative)

```powershell
# Install Volta
winget install Volta.Volta

# Pin Node version for this project
volta pin node@20.11.0

# Run Mintlify
cd docs
mint dev --port 3333
```

---

### Option 2: Use Docker (No Node Version Change)

Run Mintlify in a Docker container with Node.js LTS:

```powershell
# Create a simple wrapper script
cd docs
docker run -it --rm -v ${PWD}:/docs -p 3333:3333 -w /docs node:20-alpine sh -c "npm install -g mint && mint dev --port 3333"
```

---

### Option 3: Temporary Workaround - Use Mintlify Web Editor

While fixing Node version:

1. Go to https://mintlify.com
2. Connect your GitHub repository
3. Edit documentation in the web interface
4. Changes will sync automatically

---

## Quick Fix (Fastest)

**Recommended**: Use NVM to switch to Node.js 20 LTS:

```powershell
# If NVM is installed:
nvm install 20.11.0
nvm use 20.11.0

# Then run:
cd docs
mint dev --port 3333
```

---

## Verification

After switching Node versions:

```powershell
node --version  # Should be v20.x.x or v22.x.x
cd docs
mint dev --port 3333
```

Should start successfully on http://localhost:3333

---

**Note**: Your Next.js app can continue using Node.js v25, but Mintlify needs LTS. Use NVM to switch between versions as needed.
