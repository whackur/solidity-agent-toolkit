import { realpathSync } from 'fs'
import { resolve } from 'path'

import type { EtherscanParser } from '../explorer/etherscan-parser.js'
import {
    getSolidityFilesFromFolderOrFiles,
    isFolder,
    readFile,
} from '../parserFiles.js'
import { isAddress } from '../utils/regEx.js'
import type { CompareContracts, DiffFiles } from './types.js'
import { compareSourceCode } from './source-comparison.js'

export const diffVerified2Local = async (
    addressA: string,
    etherscanParserA: EtherscanParser,
    fileOrBaseFolders: string[],
    ignoreFilesOrFolders: string[] = [],
): Promise<CompareContracts> => {
    const files: DiffFiles[] = []
    const { files: aFiles, contractName: contractNameA } =
        await etherscanParserA.getSourceCode(addressA)

    if (aFiles.length === 1 && isAddress(aFiles[0].filename)) {
        const aFile = aFiles[0]
        const bFile = fileOrBaseFolders[0]
        if (isFolder(bFile)) {
            throw Error(
                `Contract with address ${addressA} is a single, flat file so cannot be compared to a local files under folder(s) "${fileOrBaseFolders.toString()}".`,
            )
        }

        const bCode = readFile(bFile, 'sol')
        files.push(compareSourceCode(aFile.filename, aFile.code, bCode))
        return {
            files,
            contractNameA,
            local: 'file',
        }
    }

    const bFiles = await getSolidityFilesFromFolderOrFiles(
        fileOrBaseFolders,
        ignoreFilesOrFolders,
    )

    for (const aFile of aFiles) {
        let bFile: string | undefined
        for (const baseFolder of fileOrBaseFolders) {
            const aFileResolvedPath = resolve(
                process.cwd(),
                baseFolder,
                aFile.filename,
            )
            try {
                // Resolve package symlinks to match the paths returned by the walker.
                const aFileRealPath = realpathSync(aFileResolvedPath)
                bFile = bFiles.find((candidate) => candidate === aFileRealPath)
                if (bFile) break
            } catch {
                // Continue checking the other base folders.
            }
        }

        if (bFile) {
            const bCode = readFile(bFile)
            files.push(compareSourceCode(aFile.filename, aFile.code, bCode))
        } else {
            files.push({
                filename: aFile.filename,
                aCode: aFile.code,
                result: 'removed',
            })
        }
    }

    return {
        files: files.sort((a, b) => a.filename.localeCompare(b.filename)),
        contractNameA,
    }
}
