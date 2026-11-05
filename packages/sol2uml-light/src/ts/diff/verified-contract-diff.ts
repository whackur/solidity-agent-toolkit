import type { EtherscanParser } from '../explorer/etherscan-parser.js'
import type { CompareContracts, DiffOptions } from './types.js'
import { compareVerifiedSourceFiles } from './source-comparison.js'

export const diffVerifiedContracts = async (
    addressA: string,
    addressB: string,
    etherscanParserA: EtherscanParser,
    etherscanParserB: EtherscanParser,
    _options: DiffOptions,
): Promise<CompareContracts> => {
    const { files: aFiles, contractName: contractNameA } =
        await etherscanParserA.getSourceCode(addressA)
    const { files: bFiles, contractName: contractNameB } =
        await etherscanParserB.getSourceCode(addressB)

    return {
        files: compareVerifiedSourceFiles(aFiles, bFiles),
        contractNameA,
        contractNameB,
    }
}
