export type Platform = "win32" | "darwin" | "linux";

export function currentPlatform(): Platform {
  if (process.platform !== "win32" && process.platform !== "darwin" && process.platform !== "linux") throw new Error(`Unsupported PC/SC platform: ${process.platform}`);
  return process.platform;
}

export const SCARD_S_SUCCESS = 0x00000000;
export const SCARD_F_INTERNAL_ERROR = 0x80100001;
export const SCARD_E_CANCELLED = 0x80100002;
export const SCARD_E_INVALID_HANDLE = 0x80100003;
export const SCARD_E_INVALID_PARAMETER = 0x80100004;
export const SCARD_E_INVALID_TARGET = 0x80100005;
export const SCARD_E_NO_MEMORY = 0x80100006;
export const SCARD_F_WAITED_TOO_LONG = 0x80100007;
export const SCARD_E_INSUFFICIENT_BUFFER = 0x80100008;
export const SCARD_E_UNKNOWN_READER = 0x80100009;
export const SCARD_E_TIMEOUT = 0x8010000a;
export const SCARD_E_SHARING_VIOLATION = 0x8010000b;
export const SCARD_E_NO_SMARTCARD = 0x8010000c;
export const SCARD_E_UNKNOWN_CARD = 0x8010000d;
export const SCARD_E_CANT_DISPOSE = 0x8010000e;
export const SCARD_E_PROTO_MISMATCH = 0x8010000f;
export const SCARD_E_NOT_READY = 0x80100010;
export const SCARD_E_INVALID_VALUE = 0x80100011;
export const SCARD_E_SYSTEM_CANCELLED = 0x80100012;
export const SCARD_F_COMM_ERROR = 0x80100013;
export const SCARD_F_UNKNOWN_ERROR = 0x80100014;
export const SCARD_E_INVALID_ATR = 0x80100015;
export const SCARD_E_NOT_TRANSACTED = 0x80100016;
export const SCARD_E_READER_UNAVAILABLE = 0x80100017;
export const SCARD_P_SHUTDOWN = 0x80100018;
export const SCARD_E_PCI_TOO_SMALL = 0x80100019;
export const SCARD_E_READER_UNSUPPORTED = 0x8010001a;
export const SCARD_E_DUPLICATE_READER = 0x8010001b;
export const SCARD_E_CARD_UNSUPPORTED = 0x8010001c;
export const SCARD_E_NO_SERVICE = 0x8010001d;
export const SCARD_E_SERVICE_STOPPED = 0x8010001e;
export const SCARD_E_UNEXPECTED = 0x8010001f;
export const SCARD_E_ICC_INSTALLATION = 0x80100020;
export const SCARD_E_ICC_CREATEORDER = 0x80100021;
export const SCARD_E_DIR_NOT_FOUND = 0x80100023;
export const SCARD_E_FILE_NOT_FOUND = 0x80100024;
export const SCARD_E_NO_DIR = 0x80100025;
export const SCARD_E_NO_FILE = 0x80100026;
export const SCARD_E_NO_ACCESS = 0x80100027;
export const SCARD_E_WRITE_TOO_MANY = 0x80100028;
export const SCARD_E_BAD_SEEK = 0x80100029;
export const SCARD_E_INVALID_CHV = 0x8010002a;
export const SCARD_E_UNKNOWN_RES_MNG = 0x8010002b;
export const SCARD_E_NO_SUCH_CERTIFICATE = 0x8010002c;
export const SCARD_E_CERTIFICATE_UNAVAILABLE = 0x8010002d;
export const SCARD_E_NO_READERS_AVAILABLE = 0x8010002e;
export const SCARD_E_COMM_DATA_LOST = 0x8010002f;
export const SCARD_E_NO_KEY_CONTAINER = 0x80100030;
export const SCARD_E_SERVER_TOO_BUSY = 0x80100031;
export const SCARD_W_UNSUPPORTED_CARD = 0x80100065;
export const SCARD_W_UNRESPONSIVE_CARD = 0x80100066;
export const SCARD_W_UNPOWERED_CARD = 0x80100067;
export const SCARD_W_RESET_CARD = 0x80100068;
export const SCARD_W_REMOVED_CARD = 0x80100069;
export const SCARD_W_SECURITY_VIOLATION = 0x8010006a;
export const SCARD_W_WRONG_CHV = 0x8010006b;
export const SCARD_W_CHV_BLOCKED = 0x8010006c;
export const SCARD_W_EOF = 0x8010006d;
export const SCARD_W_CANCELLED_BY_USER = 0x8010006e;
export const SCARD_W_CARD_NOT_AUTHENTICATED = 0x8010006f;

export const SCARD_SCOPE_USER = 0;
export const SCARD_SCOPE_TERMINAL = 1;
export const SCARD_SCOPE_SYSTEM = 2;
export const SCARD_SHARE_EXCLUSIVE = 1;
export const SCARD_SHARE_SHARED = 2;
export const SCARD_SHARE_DIRECT = 3;
export const SCARD_PROTOCOL_UNDEFINED = 0;
export const SCARD_PROTOCOL_UNSET = 0;
export const SCARD_PROTOCOL_T0 = 1;
export const SCARD_PROTOCOL_T1 = 2;
export const SCARD_PROTOCOL_ANY = 3;
export const SCARD_LEAVE_CARD = 0;
export const SCARD_RESET_CARD = 1;
export const SCARD_UNPOWER_CARD = 2;
export const SCARD_EJECT_CARD = 3;
export const SCARD_STATE_UNAWARE = 0;
export const SCARD_STATE_IGNORE = 0x0001;
export const SCARD_STATE_CHANGED = 0x0002;
export const SCARD_STATE_UNKNOWN = 0x0004;
export const SCARD_STATE_UNAVAILABLE = 0x0008;
export const SCARD_STATE_EMPTY = 0x0010;
export const SCARD_STATE_PRESENT = 0x0020;
export const SCARD_STATE_ATRMATCH = 0x0040;
export const SCARD_STATE_EXCLUSIVE = 0x0080;
export const SCARD_STATE_INUSE = 0x0100;
export const SCARD_STATE_MUTE = 0x0200;
export const SCARD_STATE_UNPOWERED = 0x0400;
export const INFINITE = 0xffffffff;
export const SCARD_ATTR_VENDOR_NAME = 0x00010100;
export const SCARD_ATTR_VENDOR_IFD_TYPE = 0x00010101;
export const SCARD_ATTR_VENDOR_IFD_VERSION = 0x00010102;
export const SCARD_ATTR_VENDOR_IFD_SERIAL_NO = 0x00010103;
export const SCARD_ATTR_CHANNEL_ID = 0x00020110;
export const SCARD_ATTR_PROTOCOL_TYPES = 0x00030120;
export const SCARD_ATTR_DEFAULT_CLK = 0x00030121;
export const SCARD_ATTR_MAX_CLK = 0x00030122;
export const SCARD_ATTR_DEFAULT_DATA_RATE = 0x00030123;
export const SCARD_ATTR_MAX_DATA_RATE = 0x00030124;
export const SCARD_ATTR_MAX_IFSD = 0x00030125;
export const SCARD_ATTR_POWER_MGMT_SUPPORT = 0x00040131;
export const SCARD_ATTR_USER_TO_CARD_AUTH_DEVICE = 0x00050140;
export const SCARD_ATTR_USER_AUTH_INPUT_DEVICE = 0x00050142;
export const SCARD_ATTR_CHARACTERISTICS = 0x00060150;
export const SCARD_ATTR_CURRENT_PROTOCOL_TYPE = 0x00080201;
export const SCARD_ATTR_CURRENT_CLK = 0x00080202;
export const SCARD_ATTR_CURRENT_F = 0x00080203;
export const SCARD_ATTR_CURRENT_D = 0x00080204;
export const SCARD_ATTR_CURRENT_N = 0x00080205;
export const SCARD_ATTR_CURRENT_W = 0x00080206;
export const SCARD_ATTR_CURRENT_IFSC = 0x00080207;
export const SCARD_ATTR_CURRENT_IFSD = 0x00080208;
export const SCARD_ATTR_CURRENT_BWT = 0x00080209;
export const SCARD_ATTR_CURRENT_CWT = 0x0008020a;
export const SCARD_ATTR_CURRENT_EBC_ENCODING = 0x0008020b;
export const SCARD_ATTR_EXTENDED_BWT = 0x0008020c;
export const SCARD_ATTR_ICC_PRESENCE = 0x00090300;
export const SCARD_ATTR_ICC_INTERFACE_STATUS = 0x00090301;
export const SCARD_ATTR_CURRENT_IO_STATE = 0x00090302;
export const SCARD_ATTR_ATR_STRING = 0x00090303;
export const SCARD_ATTR_ICC_TYPE_PER_ATR = 0x00090304;
export const SCARD_ATTR_ESC_RESET = 0x0007a000;
export const SCARD_ATTR_ESC_CANCEL = 0x0007a003;
export const SCARD_ATTR_ESC_AUTHREQUEST = 0x0007a005;
export const SCARD_ATTR_MAXINPUT = 0x0007a007;
export const SCARD_ATTR_DEVICE_UNIT = 0x7fff0001;
export const SCARD_ATTR_DEVICE_IN_USE = 0x7fff0002;
export const SCARD_ATTR_DEVICE_FRIENDLY_NAME_A = 0x7fff0003;
export const SCARD_ATTR_DEVICE_SYSTEM_NAME_A = 0x7fff0004;
export const SCARD_ATTR_DEVICE_FRIENDLY_NAME_W = 0x7fff0005;
export const SCARD_ATTR_DEVICE_SYSTEM_NAME_W = 0x7fff0006;
export const SCARD_ATTR_SUPRESS_T1_IFS_REQUEST = 0x7fff0007;

export function platformConstants(platform: Platform = currentPlatform()) {
  const windows = platform === "win32";
  return Object.freeze({
    MAX_ATR_SIZE: windows ? 36 : 33,
    SCARD_PROTOCOL_RAW: windows ? 0x10000 : 4,
    SCARD_E_UNSUPPORTED_FEATURE: windows ? 0x80100022 : 0x8010001f,
    SCARD_UNKNOWN: windows ? 0 : 1,
    SCARD_ABSENT: windows ? 1 : 2,
    SCARD_PRESENT: windows ? 2 : 4,
    SCARD_SWALLOWED: windows ? 3 : 8,
    SCARD_POWERED: windows ? 4 : 16,
    SCARD_NEGOTIABLE: windows ? 5 : 32,
    SCARD_SPECIFIC: windows ? 6 : 64,
  });
}

export const { MAX_ATR_SIZE, SCARD_PROTOCOL_RAW, SCARD_E_UNSUPPORTED_FEATURE, SCARD_UNKNOWN, SCARD_ABSENT, SCARD_PRESENT, SCARD_SWALLOWED, SCARD_POWERED, SCARD_NEGOTIABLE, SCARD_SPECIFIC } = platformConstants();

export function SCARD_CTL_CODE(code: number, platform: Platform = currentPlatform()): number {
  if (!Number.isInteger(code) || code < 0 || code > (platform === "win32" ? 0xfff : 0xbdffffff)) throw new RangeError("Control function number out of range");
  return platform === "win32" ? (0x00310000 | (code << 2)) >>> 0 : 0x42000000 + code;
}
