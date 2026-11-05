import { lstatSync } from 'fs'
import { basename, extname } from 'path'
import klaw from 'klaw'

const debug = require('debug')('sol2uml-light')

export async function getSolidityFilesFromFolderOrFiles(
    folderOrFilePaths: readonly string[],
    ignoreFilesOrFolders: readonly string[],
    subfolders: number = -1,
): Promise<string[]> {
    let files: string[] = []
    for (const folderOrFilePath of folderOrFilePaths) {
        const result = await getSolidityFilesFromFolderOrFile(
            folderOrFilePath,
            ignoreFilesOrFolders,
            subfolders,
        )
        files = files.concat(result)
    }
    return files
}

export function getSolidityFilesFromFolderOrFile(
    folderOrFilePath: string,
    ignoreFilesOrFolders: readonly string[] = [],
    depthLimit: number = -1,
): Promise<string[]> {
    debug(`About to get Solidity files under ${folderOrFilePath}`)

    return new Promise<string[]>((resolve, reject) => {
        try {
            const folderOrFile = lstatSync(folderOrFilePath)
            if (folderOrFile.isDirectory()) {
                const files: string[] = []
                const filter = (file: string): boolean =>
                    !ignoreFilesOrFolders.includes(basename(file))

                klaw(folderOrFilePath, {
                    depthLimit,
                    filter,
                    preserveSymlinks: true,
                })
                    .on('data', (file) => {
                        if (
                            extname(file.path) === '.sol' &&
                            // Foundry can create an output folder with a source file's name.
                            file.stats.isFile()
                        ) {
                            files.push(file.path)
                        }
                    })
                    .on('end', () => resolve(files))
            } else if (folderOrFile.isFile()) {
                if (extname(folderOrFilePath) === '.sol') {
                    debug(`Got Solidity file to be parsed: ${folderOrFilePath}`)
                    resolve([folderOrFilePath])
                } else {
                    reject(
                        Error(
                            `File ${folderOrFilePath} does not have a .sol extension.`,
                        ),
                    )
                }
            } else {
                reject(
                    Error(
                        `Could not find directory or file ${folderOrFilePath}`,
                    ),
                )
            }
        } catch (err) {
            let error: Error
            if (err?.code === 'ENOENT') {
                error = Error(
                    `No such file or folder ${folderOrFilePath}. Make sure you pass in the root directory of the contracts`,
                )
            } else {
                error = new Error(
                    `Failed to get Solidity files under folder or file ${folderOrFilePath}`,
                    { cause: err },
                )
            }
            console.error(error)
            reject(error)
        }
    })
}
