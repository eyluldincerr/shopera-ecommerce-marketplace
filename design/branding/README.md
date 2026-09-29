# Branding assets

- `shopera-logo-marketplace.png`: copied unchanged from the Buyer/Seller app's `src/assets/logo.png`.
- `shopera-logo-admin.png`: copied unchanged from Admin's `src/assets/branding/shoperalogo.png`.

SHA-256 comparison confirms that these two supplied files are byte-for-byte identical. They are not distinct light/dark variants. The light wordmark is intended for a dark background. Both application copies remain intact; an original alternate-background export can be added later if supplied.

Editable/vector masters and a brand guide are not included yet. Preserve original authorship and asset provenance when adding them.

## Optional README logo

Reserved path: `design/branding/shopera-logo-readme.png` (relative to the repository root).

Supply a genuine transparent Shopera logo export with a dark wordmark suitable for GitHub's light background. This file does not exist yet. Do not overwrite either existing logo or generate a substitute.

GitHub strips inline styles from README HTML, so a CSS dark-background container is not a reliable solution. See [GitHub's rendering pipeline](https://github.com/github/markup). The root README therefore keeps the optional image tag in an HTML comment. After supplying the export, uncomment that tag in a separate documentation commit.
