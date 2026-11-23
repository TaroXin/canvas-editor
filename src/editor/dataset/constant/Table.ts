import { ITableOption } from '../../interface/table/Table'

export const defaultTableOption: Readonly<Required<ITableOption>> = {
  tdPadding: [0, 5, 0, 5],
  defaultTrMinHeight: 0,
  defaultColMinWidth: 40,
  defaultBorderColor: '#000000',
  overflow: false
}
