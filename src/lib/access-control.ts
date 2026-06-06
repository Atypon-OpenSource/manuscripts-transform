import {AccessContext, AccessRule, ManuscriptNode, Nodes} from "../schema"

const hasDataTracked = (node: ManuscriptNode): boolean => {
  const dataTracked = node.attrs.dataTracked
  return Array.isArray(dataTracked) ? dataTracked.length > 0 : !!dataTracked
}

const getDataTrackedAuthorID = (node: ManuscriptNode): string | null => {
  // TODO:: find authorID of the change
  return `dataTracked?.authorID`
}

const canHandleTrackedNode = (
  node: ManuscriptNode,
  context: AccessContext
): boolean => {
  const authorID = getDataTrackedAuthorID(node)
  if (!authorID) return true

  const isOwnChange = authorID === context.userId

  return isOwnChange
    ? context.capabilities.handleSuggestion ||
    context.capabilities.rejectOwnSuggestion
    : context.capabilities.handleSuggestion
}


/** LEVEL 1: Global Defaults **/
const globalDefaults = {
  insert: (_: ManuscriptNode | null, ctx: AccessContext) =>
    ctx.capabilities.editArticle,
  delete: (_: ManuscriptNode, ctx: AccessContext) =>
    ctx.capabilities.editArticle,
  attr: (_: ManuscriptNode, ctx: AccessContext) =>
    ctx.capabilities.editArticle,
}

type NodeRules = {
  insert?: AccessRule
  delete?: AccessRule
  attr?: AccessRule
}

/** LEVEL 2: Node-level Rules **/
const nodeRules: Partial<Record<Nodes, NodeRules>> = {
  comment: {
    insert: (_, ctx) => ctx.capabilities.createComment,
    delete: (node, ctx) => {
      const isOwn = node.attrs.userID === ctx.userId
      return isOwn
        ? ctx.capabilities.handleOwnComments
        : ctx.capabilities.handleOthersComments
    },
    attr: () => false,
  },
}

/** LEVEL 3: Node + Attribute Rules **/
const nodeAttrRules: Partial<Record<Nodes, Record<string, AccessRule>>> = {
  comment: {
    contents: (node, ctx) => {
      const isOwn = node.attrs.userID === ctx.userId
      return isOwn
        ? ctx.capabilities.handleOwnComments
        : ctx.capabilities.handleOthersComments
    },
    resolved: (node, ctx) => {
      const isOwn = node.attrs.userID === ctx.userId
      return isOwn
        ? ctx.capabilities.resolveOwnComment
        : ctx.capabilities.resolveOthersComment
    },
  },
}

export const canInsertNode = (
  nodeType: Nodes,
  context: AccessContext
): boolean => {
  const rule = nodeRules[nodeType]?.insert ?? globalDefaults.insert
  return rule(null as unknown as ManuscriptNode, context)
}

export const canDeleteNode = (
  nodeType: Nodes,
  node: ManuscriptNode,
  context: AccessContext
): boolean => {
  const rule = nodeRules[nodeType]?.delete ?? globalDefaults.delete
  const hasBasePermission = rule(node, context)

  if (hasDataTracked(node)) {
    return hasBasePermission && canHandleTrackedNode(node, context)
  }

  return hasBasePermission
}

export const canEditAttr = (
  nodeType: Nodes,
  node: ManuscriptNode,
  attr: string,
  context: AccessContext
): boolean => {
  let hasBasePermission: boolean

  // Level 3: Node + Attribute specific
  const nodeAttrRule = nodeAttrRules[nodeType]?.[attr]
  if (nodeAttrRule) {
    hasBasePermission = nodeAttrRule(node, context)
  } else {
    // Level 2: Node default
    const nodeRule = nodeRules[nodeType]?.attr
    if (nodeRule) {
      hasBasePermission = nodeRule(node, context)
    } else {
      // Level 1: Global default
      hasBasePermission = globalDefaults.attr(node, context)
    }
  }

  if (hasDataTracked(node)) {
    return hasBasePermission && canHandleTrackedNode(node, context)
  }

  return hasBasePermission
}
