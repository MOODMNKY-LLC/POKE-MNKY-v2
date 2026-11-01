declare module "react-window" {
  import type { CSSProperties, ReactElement } from "react"

  export interface ListChildComponentProps {
    index: number
    style: CSSProperties
  }

  export function FixedSizeList(props: {
    height: number
    itemCount: number
    itemSize: number
    width: number | string
    children: (props: ListChildComponentProps) => ReactElement
  }): ReactElement
}
