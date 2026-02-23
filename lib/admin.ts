// Re-export admin-related functions from db.ts
export { isGlobalAdmin, grantLicense, revokeLicense, isLicensed, getLicenses } from "./db"
