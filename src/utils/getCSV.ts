export const getCSV = (mapData: Array<number>, size: number) => {
  const csvRow: Array<string> = []

  for (let i = 0; i < size; i += size) {
    const val = mapData.slice(i, size)
    csvRow.push(val.map(x => x.toLocaleString()).join('\t'))
  }
  const csvString = csvRow.join('\r\n')

  const a = document.createElement('a')
  a.href = 'data:attachment/csv,' + encodeURIComponent(csvString)
  a.target = '_blank'
  a.download = 'mapdata.csv'

  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
