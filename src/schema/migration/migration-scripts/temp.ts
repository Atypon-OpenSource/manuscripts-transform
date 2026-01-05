import {MigrationScript} from "../migration-script";
import {JSONProsemirrorNode} from "../../../types";

class MigrationTemp implements MigrationScript {
    fromVersion = 'temp'
    toVersion = 'temp'

    migrateNode(node: JSONProsemirrorNode): JSONProsemirrorNode {
        if (node.type === 'contributor') {
            node.attrs.affiliationIDs = node.attrs.affiliations
            node.attrs.correspIDs = node.attrs.corresp.map(c => c.correspID)
            node.attrs.footnoteIDs = node.attrs.footnote.map(f => f.noteID)
            node.attrs.given = node.attrs.bibliographicName.given
            node.attrs.family = node.attrs.bibliographicName.family
            node.attrs.suffix = node.attrs.bibliographicName.suffix
            node.attrs.ORCID = node.attrs.ORCIDIdentifier

            delete node.attrs.affiliations
            delete node.attrs.corresp
            delete node.attrs.bibliographicName
            delete node.attrs.userID
            delete node.attrs.ORCIDIdentifier
            delete node.attrs.footnote
        }
        if (node.type === 'comment') {
            const contribution = node.attrs.contributions[0]
            node.attrs.userID = contribution.profileID
            node.attrs.timestamp = contribution.timestamp
            delete node.attrs.contributions
        }
        return node
    }
}

export default MigrationTemp
