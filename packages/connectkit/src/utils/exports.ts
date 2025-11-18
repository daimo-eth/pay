// Exported utilities, useful for @rozoai/pay users.
import packageJson from "../../package.json";

export const rozoPayVersion = packageJson.version;

// Error parsing utilities
export { parseErrorMessage, categorizeError, ErrorType } from "./errorParser";
