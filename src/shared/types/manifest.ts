import type { ManifestV3 } from '@types/chrome';

/**
 * Type-safe Manifest V3 definition helper.
 * Ensures the manifest object is valid at compile time.
 */
export function defineManifest(manifest: ManifestV3): ManifestV3 {
  return manifest;
}
