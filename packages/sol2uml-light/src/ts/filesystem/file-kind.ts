import { lstatSync } from 'fs'

export const isFile = (fileName: string): boolean => {
    try {
        return lstatSync(fileName).isFile()
    } catch {
        return false
    }
}

export const isFolder = (fileName: string): boolean => {
    try {
        return lstatSync(fileName).isDirectory()
    } catch {
        return false
    }
}
