import { JSONNode } from '../migrate'
import { MigrationScript } from '../migration-script'

class Migration2322 implements MigrationScript {
  fromVersion = '2.3.21'
  toVersion = '2.3.22'

  migrateNode(node: JSONNode, doc: JSONNode): JSONNode {
    if (node.type === 'table_element' && Array.isArray(node.content)) {
      let figcaptionNode = null
      const remainingContent = []

      for (const child of node.content) {
        if (child.type === 'figcaption') {
          figcaptionNode = child
        } else {
          remainingContent.push(child)
        }
      }

      // Create the new content array
      const newContent = figcaptionNode
        ? [figcaptionNode, ...remainingContent]
        : remainingContent

      // Return the updated node with the new content order
      return {
        ...node,
        content: newContent,
      }
    }

    return node
  }
}

export default Migration2322
