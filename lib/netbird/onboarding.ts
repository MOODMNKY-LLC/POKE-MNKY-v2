export const MANAGEMENT_URL = "https://netbird.moodmnky.com"
export const GROUP_DISPLAY_NAME = "Average At Best: Pokemon Battle League"
export const DNS_SUFFIX = "mesh.moodmnky.com"
// TODO: a hostname for the game server is pending confirmation; switch this one constant when it lands.
export const GAME_SERVER_HOST = "100.64.163.195"
export const GAME_SERVER_PORT = 30456
export const GAME_SERVER_ADDRESS = `${GAME_SERVER_HOST}:${GAME_SERVER_PORT}`
export const GAME_SERVER_PROTOCOL = "TCP"
export const GAME_NETWORK_NAME = "AAB Battle Net"
export const RYUBING_LDN_GUIDE_URL = "https://docs.ryujinx.app/guides/ldn-guide/"

export const INSTALL_LINKS = {
  windows: {
    docs: "https://docs.netbird.io/get-started/install/windows",
    exe: "https://pkgs.netbird.io/windows/x64",
    msi: "https://pkgs.netbird.io/windows/msi/x64",
  },
  macos: {
    docs: "https://docs.netbird.io/get-started/install/macos",
    appleSilicon: "https://pkgs.netbird.io/macos/arm64",
    intel: "https://pkgs.netbird.io/macos/amd64",
  },
  ios: {
    docs: "https://docs.netbird.io/get-started/install/ios",
    appStore: "https://apps.apple.com/app/netbird-p2p-vpn/id6469329339",
  },
  android: {
    docs: "https://docs.netbird.io/get-started/install/android",
    playStore: "https://play.google.com/store/apps/details?id=io.netbird.client",
  },
} as const

export const DOCS_LINKS = {
  windows: INSTALL_LINKS.windows.docs,
  macos: INSTALL_LINKS.macos.docs,
  ios: INSTALL_LINKS.ios.docs,
  android: INSTALL_LINKS.android.docs,
  desktopApp: "https://docs.netbird.io/client/desktop-app",
} as const

export const SETUP_KEY_CLI_EXAMPLE = `netbird up --setup-key <your key> --management-url https://netbird.moodmnky.com`
