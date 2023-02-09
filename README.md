# @manuscripts/manuscript-transform

ProseMirror transformer for Manuscripts applications.

It provides a way to import/export [Manuscript JSON Schema](https://gitlab.com/mpapp-public/manuscripts-json-schema) formatted data from and to other formats such as (JATS XML, STS XML, HTML, [ProseMirror Model](https://prosemirror.net/docs/guide/#doc))

# Components 

**Decoder**: converts Manuscript JSON Schema to ProseMirror Model.

**Encoder**: converts ProseMirror Model to Manuscript JSON Schema.

**ManuscriptNode**: a Manuscript definition of a ProseMirror Node which hold a ProseMirror fragment containing zero or more child nodes, for example a section node or a figure node.

**ManuscriptFragment**:  a Manuscript definition of a ProseMirror Fragment represents a node's collection of child nodes.

**ManuscriptMark**:  a Manuscript definition of a ProseMirror mark which is a piece of information that can be attached to a node, such as it being emphasized, in code font, or a link

**JATSExporter**: converts Manuscript JSON Schema to JATS XML via ProseMirror Model.

**JATSImporter** converts JATS XML to Manuscript JSON Schema via ProseMirror Model.

# Usage
dfgf
### Manuscript JSON Schema to ProseMirror Model

```typescript
import { Decoder, ContainedModel } from '@manuscripts/manuscript-transform'


// Data from Manuscript JSON Schema file
const data: ContainedModel[]
const modelMap = new Map<string, ContainedModel>(
  data.map((model) => [model._id, model])
)
const decoder = new Decoder(modelMap)
// manuscriptID =>  The ID for the manuscript data can be found in MPManuscript Model
const manuscriptNode = decoder.createArticleNode(manuscriptID)
```    

### ProseMirror Model to Manuscript JSON Schema

```typescript
import { encode } from '@manuscripts/manuscript-transform'

const manuscriptNode: ManuscriptNode
const result = encode(manuscriptNode)
```

### Manuscript JSON Schema to JATS XML

```typescript
import {
  ContainedModel,
  JATSExporter,
  JATSExporterOptions,
  ManuscriptFragment,
} from '@manuscripts/manuscript-transform'

// Data from Manuscript JSON Schema file
const data: ContainedModel[]
const modelMap = new Map<string, ContainedModel>(
  data.map((model) => [model._id, model])
)
const decoder = new Decoder(modelMap)
// manuscriptID =>  The ID for the manuscript data can be found in MPManuscript Model
const manuscriptNode = decoder.createArticleNode(manuscriptID)

const options: JATSExporterOptions   
const result = new JATSExporter().serializeToJATS(manuscriptNode.content, modelMap, manuscriptID, options)
```

#### JATSExporterOptions

**version**: JATS output version, supported versions ('1.1' , '1.2d1' , '1.2')\
**doi**: DOI of the article\
**id**: article id\
**frontMatterOnly**: to export article front only

### JATS XML to Manuscript JSON Schema

```typescript
import { parseJATSArticle } from '@manuscripts/manuscript-transform'

// JATS XML document
const doc: Document
const result = await parseJATSArticle(doc)
```

## ProseMirror Schema 

As mentioned in ProseMirror [documentation](https://prosemirror.net/docs/ref/#model.Document_Schema) the schema defined as 
>Every ProseMirror document conforms to a schema, which describes the set of nodes and marks that it is made out of, 
along with the relations between those, such as which node may occur as a child node of which other nodes. 

You can find the definition of the schema in **/schema** folder where it is constructed form a set of nodes and marks

### ProseMirror Node 

>This class represents a node in the tree that makes up a ProseMirror document. So a document is an instance of Node, with children that are also instances of Node.

Please check [Node class](https://prosemirror.net/docs/ref/#model.Node) documentation to know more about its attributes and methods

Let's take **figure** node as an example

```typescript
export const figure: NodeSpec = {
    content: 'figcaption* paragraph* attribution*',
   // ...
   // ...
```

The content attribute here describe the children of this node, a figure can have captions, paragraphs and attributions and each 
of these nodes can also have their own content 

```typescript
 export const figure: NodeSpec = {
 // ...
 // ...
  attrs: {
    id: { default: '' },
    originalURL: { default: undefined },
 ```   
     
attrs describe the attributes that can this figure node have for example an ID or a URL        
  
```typescript
toDOM: (node) => {}
```

 this function defines the default way of the figure node to be serialized to DOM/HTML, the return type is a DOM node or an array structure that describes one, with an optional number zero (“hole”) in it to indicate where the node's content should be inserted.


### ProseMirror Mark

>mark is a piece of information that can be attached to a node, such as it being emphasized, in code font, or a link. It has a type and optionally a set of attributes that provide further information (such as the target of the link). 
>Marks are created through a Schema, which controls which types exist and which attributes they have.

Please check [Mark class](https://prosemirror.net/docs/ref/#model.Mark) documentation to know more about its attributes and methods

Let's take italic mark as an example 

```typescript
export const italic: MarkSpec = {
  parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
  toDOM: () => ['i'],
}
```

parseDOM here define how to deserialize this mark from DOM, for example an **em** tag will be parsed to this italic mark 

## Deserialize JATS to ProseMirror 

in **jats-body-dom-parser.ts** file you can find the rules of how the parser can deserialize JATS XML tags into ProseMirror nodes

for example to map **sec** JATS tag to ProseMirror section node 

```typescript
      {
        tag: 'sec',
        node: 'section',
        getAttrs: (node) => {
          const element = node as HTMLElement
    
          return {
            id: element.getAttribute('id'),
            category: chooseSectionCategory(element),
          }
        },
      },
```

getAttrs function here extract the attributes of the **sec** tag and map them into section node attributes

## Serialize ProseMirror nodes to JATS XML

in **jats-exporter.ts** file you can find the serialization rules defined in **createSerializer** method

section node to sec tag

```typescript
section: (node) => {
  const attrs: { [key: string]: string } = {
    id: normalizeID(node.attrs.id),
  }

  if (node.attrs.category) {
    attrs['sec-type'] = chooseSecType(node.attrs.category)
  }

  return ['sec', attrs, 0]
}
```
