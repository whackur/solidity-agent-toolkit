import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

import { getSolidityFilesFromFolderOrFile } from '../index.js'
import { parseUmlClassesFromFiles } from '../index.js'
import { parseFoundryTomlRemappings } from '../filesystem/foundry-remappings.js'
import { UmlClass } from '../umlClass.js'

describe('Parser', () => {
    test('keeps class ids interleaved across concurrent parses', async () => {
        const originalIdCounter = UmlClass.idCounter
        let tempDirectory: string | undefined
        try {
            UmlClass.idCounter = 0
            tempDirectory = await mkdtemp(
                join(tmpdir(), 'sol2uml-concurrent-parser-'),
            )
            await Promise.all([
                writeFile(join(tempDirectory, 'A.sol'), 'contract A {}'),
                writeFile(join(tempDirectory, 'B.sol'), 'contract B {}'),
            ])
            const sourceFiles = [
                join(tempDirectory, 'A.sol'),
                join(tempDirectory, 'B.sol'),
            ]

            const [firstParse, secondParse] = await Promise.all([
                parseUmlClassesFromFiles(sourceFiles, []),
                parseUmlClassesFromFiles(sourceFiles, []),
            ])

            expect(firstParse.map(({ id }) => id).sort()).toEqual([0, 2])
            expect(secondParse.map(({ id }) => id).sort()).toEqual([1, 3])
            expect(firstParse.map(({ name }) => name).sort()).toEqual([
                'A',
                'B',
            ])
            expect(secondParse.map(({ name }) => name).sort()).toEqual([
                'A',
                'B',
            ])
        } finally {
            UmlClass.idCounter = originalIdCounter
            if (tempDirectory) {
                await rm(tempDirectory, { recursive: true, force: true })
            }
        }
    })

    test('parses quoted Foundry remappings and ignores comments or invalid entries', () => {
        const remappings = parseFoundryTomlRemappings(
            `remappings = [\n  "@lib/=lib/",\n  # ignored\n  "[/=target",\n]`,
        )

        expect(remappings.map(({ from, to }) => [from.source, to])).toEqual([
            ['^@lib\\/', 'lib/'],
        ])
    })

    describe('getSolidityFilesFromFolderOrFile', () => {
        test('get Solidity files from contracts folder', async () => {
            const files =
                await getSolidityFilesFromFolderOrFile('./src/contracts')
            expect(files).toHaveLength(40)
        })

        test('get Solidity files from folder with no sol files', async () => {
            const files = await getSolidityFilesFromFolderOrFile('./src/ts')
            expect(files).toHaveLength(0)
        })

        test('get Solidity file', async () => {
            const files = await getSolidityFilesFromFolderOrFile(
                './src/contracts/Caller.sol',
            )
            expect(files).toHaveLength(1)
        })

        describe('Failures', () => {
            test("Reading a file that doesn't exist", async () => {
                expect.assertions(1)

                try {
                    await getSolidityFilesFromFolderOrFile(
                        './FleDoesNotExist.sol',
                    )
                } catch (err) {
                    expect(err.message).toMatch(/No such file or folder/)
                }
            })

            test("Reading a file that doesn't have a sol extension", async () => {
                expect.assertions(1)

                try {
                    await getSolidityFilesFromFolderOrFile('./package.json')
                } catch (err) {
                    expect(err.message).toMatch(
                        /does not have a .sol extension/,
                    )
                }
            })
        })
    })
})
