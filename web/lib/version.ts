import pkg from "../package.json";

// package.json の "version" は人間が変更するメジャー値のみを保持する（例: "0.0.0" なら 0）。
// マイナー・パッチはCDが自動算出し、環境変数 APP_VERSION（"X.Y.Z"）として
// Cloud Run に設定される（.github/workflows/deploy.yml 参照）。
//   X = package.json のメジャー値（人間が変更）
//   Y = master への push 回数（GitHub Actions の run number）
//   Z = その push に含まれるコミット数（push のたびに 0 から数え直す）
const major = pkg.version.split(".")[0] || "0";

/** 表示用バージョン文字列。ローカル開発など APP_VERSION 未設定時は "X.0.0-dev" を表示する。 */
export const appVersion = process.env.APP_VERSION || `${major}.0.0-dev`;
