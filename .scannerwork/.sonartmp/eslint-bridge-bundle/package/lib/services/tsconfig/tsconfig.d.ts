import * as ts from 'typescript';
/**
 * Gets the files resolved by a TSConfig
 *
 * The resolving of the files for a given TSConfig file is done
 * by invoking TypeScript compiler.
 *
 * @param tsConfig TSConfig to parse
 * @param parseConfigHost parsing configuration
 * @returns the resolved TSConfig files
 */
export declare function getFilesForTsConfig(tsConfig: string, parseConfigHost?: ts.ParseConfigHost): {
    files: string[];
    projectReferences: string[];
};
/**
 * Create the TSConfig file and returns its path.
 *
 * The file is written in a temporary location in the file system and is marked to be removed after Node.js process terminates.
 *
 * @param tsConfig TSConfig to write
 * @returns the resolved TSConfig file path
 */
export declare function writeTSConfigFile(tsConfig: any): Promise<{
    filename: string;
}>;
