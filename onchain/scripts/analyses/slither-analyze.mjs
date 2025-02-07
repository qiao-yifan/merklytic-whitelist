import shell from "shelljs";
const { config, exec } = shell;

config.fatal = true;

exec("pwd");

// https://github.com/crytic/solc-select#usage
exec("solc --version");

exec("slither --version");

// Ensure analyze all contracts
exec("npm run clean");

// https://github.com/crytic/slither#detectors
// Excluded false warning for the following detectors:
//    - missing-inheritance: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-inheritance
//    - solc-version: https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-versions-of-solidity
//    - unimplemented-functions: https://github.com/crytic/slither/wiki/Detector-Documentation#unimplemented-functions
exec(`
  slither \
    --exclude timestamp,missing-inheritance,solc-version,unimplemented-functions \
    .
`);
