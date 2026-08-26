// PMOVES fork: no-op afterSign. Upstream's electron-builder-notarize requires
// APPLE_ID credentials this fork does not have; without certs there is nothing
// to sign or notarize. Wired in via -c.afterSign in release-pmoves.yml.
exports.default = async function noopAfterSign() {};
