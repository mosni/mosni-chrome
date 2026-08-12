// className is MERGED with a component's own classes, never replaced (§3) - every component calls
// this instead of clobbering its own class list with a consumer-supplied className.
export function mergeClassName(
  own: string,
  className: string | undefined,
): string {
  return className ? `${own} ${className}` : own;
}
