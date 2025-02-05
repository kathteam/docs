import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import explorerStyle from "./styles/explorer.scss"

// @ts-ignore
import script from "./scripts/explorer.inline"
import { ExplorerNode, FileNode, Options } from "./ExplorerNode"
import { QuartzPluginData } from "../plugins/vfile"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

// Options interface defined in `ExplorerNode` to avoid circular dependency
const defaultOptions = {
  folderClickBehavior: "link",
  folderDefaultState: "collapsed",
  useSavedState: true,
  mapFn: (node) => {
    // dont change name of root node
    if (node.depth > 0) {
      // set emoji for file
      if (node.file) {
        switch (node.name) {
          case "user-interface-overview":
            node.displayName = "💬" + node.displayName
            break
          case "filetree-usage":
            node.displayName = "🌳" + node.displayName
            break
          case "toolbar-usage":
            node.displayName = "🧰" + node.displayName
            break
          case "editor-usage":
            node.displayName = "✏️" + node.displayName
            break
          case "user-interface-installation":
            node.displayName = "🖥️" + node.displayName
            break
          case "server-installation":
            node.displayName = "⚙️" + node.displayName
            break
          case "backend-setup":
            node.displayName = "🗄️" + node.displayName
            break
          case "documentation":
            node.displayName = "📝" + node.displayName
            break
          case "frontend-setup":
            node.displayName = "🌍" + node.displayName
            break
          case "future-work":
            node.displayName = "🛠️" + node.displayName
            break
          case "team-structure":
            node.displayName = "🤝" + node.displayName
            break
          case "workflow-guidelines":
            node.displayName = "🔀" + node.displayName
            break
          default:
            node.displayName = "📄" + node.displayName
            break
        }
      }
    }
  },
  sortFn: (a, b) => {
    // Sort order: files first, then folders. Sort folders based on custom order and files custom and then alphabetically
    if (!a.file && !b.file) {
      const customFolderOrder = ['manual', 'deployment', 'development'];
  
      // Sort folders according to custom folder order
      const aFolderName = a.name.toLowerCase();
      const bFolderName = b.name.toLowerCase();

      const aIndex = customFolderOrder.indexOf(aFolderName);
      const bIndex = customFolderOrder.indexOf(bFolderName);

      if (aIndex === -1 && bIndex === -1) {
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    }

    if (a.file && b.file) {
      const customFileOrder = [
        // root folder
        // root.manual folder
        'user-interface-overview', 'toolbar-usage',
        // root.deployment folder 
        'user-interface-installation', 'server-installation',
        // root.development folder
        'team-structure', 'workflow-guidelines', 'frontend-setup', 'backend-setup', 'documentation', 'future-work'
      ];

      // Sort files according to custom file order
      const aFileName = a.name.toLowerCase();
      const bFileName = b.name.toLowerCase();

      const aIndex = customFileOrder.indexOf(aFileName);
      const bIndex = customFileOrder.indexOf(bFileName);

      if (aIndex === -1 && bIndex === -1) {
        // numeric: true: Whether numeric collation should be used, such that "1" < "2" < "10"
        // sensitivity: "base": Only strings that differ in base letters compare as unequal. Examples: a ≠ b, a = á, a = A
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    }
  
    if (a.file && !b.file) {
      return -1;
    } else {
      return 1;
    }
  },
  filterFn: (node) => node.name !== "tags",
  order: ["filter", "map", "sort"],
} satisfies Options

export default ((userOpts?: Partial<Options>) => {
  // Parse config
  const opts: Options = { ...defaultOptions, ...userOpts }

  // memoized
  let fileTree: FileNode
  let jsonTree: string
  let lastBuildId: string = ""

  function constructFileTree(allFiles: QuartzPluginData[]) {
    // Construct tree from allFiles
    fileTree = new FileNode("")
    allFiles.forEach((file) => fileTree.add(file))

    // Execute all functions (sort, filter, map) that were provided (if none were provided, only default "sort" is applied)
    if (opts.order) {
      // Order is important, use loop with index instead of order.map()
      for (let i = 0; i < opts.order.length; i++) {
        const functionName = opts.order[i]
        if (functionName === "map") {
          fileTree.map(opts.mapFn)
        } else if (functionName === "sort") {
          fileTree.sort(opts.sortFn)
        } else if (functionName === "filter") {
          fileTree.filter(opts.filterFn)
        }
      }
    }

    // Get all folders of tree. Initialize with collapsed state
    // Stringify to pass json tree as data attribute ([data-tree])
    const folders = fileTree.getFolderPaths(opts.folderDefaultState === "open")
    jsonTree = JSON.stringify(folders)
  }

  const Explorer: QuartzComponent = ({
    ctx,
    cfg,
    allFiles,
    displayClass,
    fileData,
  }: QuartzComponentProps) => {
    if (ctx.buildId !== lastBuildId) {
      lastBuildId = ctx.buildId
      constructFileTree(allFiles)
    }

    return (
      <div class={classNames(displayClass, "explorer")}>
        <button
          type="button"
          id="explorer"
          data-behavior={opts.folderClickBehavior}
          data-collapsed={opts.folderDefaultState}
          data-savestate={opts.useSavedState}
          data-tree={jsonTree}
          aria-controls="explorer-content"
          aria-expanded={opts.folderDefaultState === "open"}
        >
          <h2>{opts.title ?? i18n(cfg.locale).components.explorer.title}</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="5 8 14 8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div id="explorer-content">
          <ul class="overflow" id="explorer-ul">
            <ExplorerNode node={fileTree} opts={opts} fileData={fileData} />
            <li id="explorer-end" />
          </ul>
        </div>
      </div>
    )
  }

  Explorer.css = explorerStyle
  Explorer.afterDOMLoaded = script
  return Explorer
}) satisfies QuartzComponentConstructor
