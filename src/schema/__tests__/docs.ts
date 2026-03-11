/*!
 * © 2026 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { JSONProsemirrorNode } from '../../types'

export const v2_3_20 = {
  type: 'manuscript',
  attrs: {
    id: 'MPManuscript:8EB79C14-9F61-483A-902F-A0B8EF5973C9',
    doi: '',
  },
  content: [
    {
      type: 'title',
      attrs: {
        id: 'MPTitles:8EB79C14-9F61-483A-902F-A0B8EF5973C1',
        placeholder: 'Insert title here...',
        dataTracked: null,
      },
      content: [
        {
          type: 'text',
          text: 'main title',
        },
      ],
    },
    {
      type: 'contributors',
      attrs: {
        id: '',
      },
      content: [
        {
          type: 'contributor',
          attrs: {
            id: 'MPContributor:585DB23A-8778-4AFF-986F-CFF7B733CDE6',
            role: 'author',
            email: 'user@example.com',
            affiliations: [
              'MPAffiliation:DED56C09-42E2-4AB4-BA15-9260389E2B08',
            ],
            bibliographicName: {
              given: 'Example',
              _id: 'MPBibliographicName:24C5AC82-0130-4C94-A6D7-E8A2699EAAC8',
              objectType: 'MPBibliographicName',
              family: 'Author',
            },
            userID: '',
            invitationID: '',
            isJointContributor: true,
            ORCIDIdentifier: '',
            dataTracked: null,
            contents: '',
          },
          content: [
            {
              type: 'text',
              text: '_',
            },
          ],
        },
        {
          type: 'contributor',
          attrs: {
            id: 'MPContributor:8AD5903E-0C9C-4F46-87AE-124142CE12C2',
            role: 'author',
            email: 'author@example.com',
            affiliations: [],
            bibliographicName: {
              given: 'Corresponding',
              _id: 'MPBibliographicName:E5B649B2-1B97-46FF-AA36-ADDC3B532517',
              objectType: 'MPBibliographicName',
              family: 'Author',
            },
            userID: '',
            invitationID: '',
            isCorresponding: 1,
            ORCIDIdentifier: '',
            dataTracked: null,
            contents: '',
          },
          content: [
            {
              type: 'text',
              text: '_',
            },
          ],
        },
      ],
    },
    {
      type: 'affiliations',
      attrs: {
        id: '',
      },
      content: [
        {
          type: 'affiliation',
          attrs: {
            id: 'MPAffiliation:DED56C09-42E2-4AB4-BA15-9260389E2B08',
            institution: 'University of Examples',
            department: 'Dept of Examples',
            addressLine1: '',
            addressLine2: '',
            addressLine3: '',
            postCode: '',
            country: 'United Kingdom',
            county: '',
            city: '',
            priority: 1,
            email: {
              href: 'mailto:',
              text: 'mail',
            },
            dataTracked: null,
          },
          content: [
            {
              type: 'text',
              text: '_',
            },
          ],
        },
      ],
    },
    {
      type: 'abstracts',
      attrs: {
        id: '',
      },
    },
    {
      type: 'body',
      attrs: {
        id: '',
      },
      content: [
        {
          type: 'toc_section',
          attrs: {
            id: 'MPSection:DFCBE345-A12D-451E-8320-723F25D2F472',
            dataTracked: null,
          },
          content: [
            {
              type: 'section_title',
              attrs: {
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'Table of Contents',
                },
              ],
            },
            {
              type: 'toc_element',
              attrs: {
                id: 'MPTOCElement:657C54DB-78B5-4206-E322-170F68263A01',
                contents:
                  '<div id="MPTOCElement:657C54DB-78B5-4206-E322-170F68263A01" class="manuscript-toc" contenteditable="false">\n  \n    \n    \n    \n    \n\n\t\n      \n        \n        \n        <ul class="manuscript-toc-list">\n      \n\t\n\t \n    <li class="manuscript-toc-list-item" data-referenced-section="MPSection:DFCBE345-A12D-451E-8320-723F25D2F472" data-referenced-section-path-length="1">\n      1. Table of Contents\n    </li>\n\n    \n\n    \n    \n    \n\n  \n    \n    \n    \n    \n\n\t\n\t \n    <li class="manuscript-toc-list-item" data-referenced-section="MPSection:77786D47-6060-4FBC-BC13-5FA754968D6A" data-referenced-section-path-length="1">\n      2. First section\n    </li>\n\n    \n\n    \n    \n    \n\n  \n    \n    \n    \n    \n\n\t\n\t \n    <li class="manuscript-toc-list-item" data-referenced-section="MPSection:F8EE617B-484B-4CF2-F1CA-014F5307D5CF" data-referenced-section-path-length="1">\n      3. Section Two\n    </li>\n\n    \n\n    \n    \n    \n\n  \n    \n    \n    \n    \n\n\t\n\t \n    <li class="manuscript-toc-list-item" data-referenced-section="MPSection:E07B0D52-9642-4D58-E577-26F8804E3DEE" data-referenced-section-path-length="1">\n      4. Bibliography\n    </li>\n\n    \n\n    \n    \n    \n      </ul>\n    \n\n  \n</div>',
                paragraphStyle:
                  'MPParagraphStyle:74D17A3A-33C0-43EB-9389-51335C698744',
                dataTracked: null,
              },
            },
          ],
        },
        {
          type: 'section',
          attrs: {
            id: 'MPSection:77786D47-6060-4FBC-BC13-5FA754968D6A',
            category: '',
            titleSuppressed: false,
            dataTracked: null,
          },
          content: [
            {
              type: 'section_title',
              attrs: {
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'First section',
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:150780D7-CFED-4529-9398-77B5C7625044',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder:
                  'Start from here. Enjoy writing! - the Manuscripts Team.',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'The first section.',
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:60C13548-23C0-4348-FE98-0510E0B61B18',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'The text in this sentence is ',
                },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'bold',
                    },
                  ],
                  text: 'bold',
                },
                {
                  type: 'text',
                  text: ', ',
                },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'italic',
                    },
                  ],
                  text: 'italic',
                },
                {
                  type: 'text',
                  text: ', or ',
                },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'underline',
                    },
                  ],
                  text: 'underlined',
                },
                {
                  type: 'text',
                  text: '.',
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:A89DC62A-90ED-4283-AB6D-06CA2519D801',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'bold',
                    },
                    {
                      type: 'italic',
                    },
                    {
                      type: 'underline',
                    },
                  ],
                  text: 'The text in this sentence is bold, italic and underlined.',
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:05A0ED43-8928-4C69-A17C-0A98795001CD',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'The text in this sentence is ',
                },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'superscript',
                    },
                  ],
                  text: 'superscript',
                },
                {
                  type: 'text',
                  text: ' and ',
                },
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'subscript',
                    },
                  ],
                  text: 'subscript',
                },
                {
                  type: 'text',
                  text: '.',
                },
              ],
            },
          ],
        },
        {
          type: 'section',
          attrs: {
            id: 'MPSection:F8EE617B-484B-4CF2-F1CA-014F5307D5CF',
            category: '',
            titleSuppressed: true,
            dataTracked: null,
          },
          content: [
            {
              type: 'section_title',
              attrs: {
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'Section Two',
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:4DF93A63-D44D-41CF-AF54-23712B8703FA',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'The heading of this section is hidden.',
                },
              ],
            },
            {
              type: 'list',
              attrs: {
                id: 'MPListElement:D1C6E3B5-C549-47B8-B051-1F534E8AA7E7',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                dataTracked: null,
                listStyleType: 'order',
              },
              content: [
                {
                  type: 'list_item',
                  attrs: {
                    placeholder: 'List item',
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        id: '',
                        paragraphStyle: '',
                        placeholder: '',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'A numbered list.',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'list',
              attrs: {
                id: 'MPListElement:F11B9FCA-5DB5-4ED4-FEF9-10CDCB64F96E',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                dataTracked: null,
                listStyleType: 'bullet',
              },
              content: [
                {
                  type: 'list_item',
                  attrs: {
                    placeholder: 'List item',
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        id: '',
                        paragraphStyle: '',
                        placeholder: '',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'A bullet list.',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'list',
              attrs: {
                id: 'MPListElement:AF5341C4-5E24-40BF-B853-F966726431EB',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                dataTracked: null,
                listStyleType: 'order',
              },
              content: [
                {
                  type: 'list_item',
                  attrs: {
                    placeholder: 'List item',
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        id: '',
                        paragraphStyle: '',
                        placeholder: '',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'A numbered list with a nested list.',
                        },
                      ],
                    },
                    {
                      type: 'list',
                      attrs: {
                        id: null,
                        paragraphStyle: '',
                        dataTracked: null,
                        listStyleType: 'order',
                      },
                      content: [
                        {
                          type: 'list_item',
                          attrs: {
                            placeholder: 'List item',
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'paragraph',
                              attrs: {
                                id: '',
                                paragraphStyle: '',
                                placeholder: '',
                                dataTracked: null,
                              },
                              content: [
                                {
                                  type: 'text',
                                  text: 'This item is nested.',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'figure_element',
              attrs: {
                figureLayout: '',
                figureStyle:
                  'MPFigureStyle:12916784-C8A2-414E-919D-490172E82B25',
                id: 'MPFigureElement:A5D68C57-B5BB-4D10-E0C3-ECED717A2AA7',
                label: '',
                sizeFraction: 0,
                suppressCaption: false,
                suppressTitle: true,
                dataTracked: null,
              },
              content: [
                {
                  type: 'figure',
                  attrs: {
                    id: 'MPFigure:D673DF08-D75E-4061-8EC1-9611EAB302F0',
                    src: 'attachment:figure1',
                    contentType: 'image/png',
                    dataTracked: null,
                  },
                },
                {
                  type: 'figcaption',
                  attrs: {
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'caption_title',
                      attrs: {
                        placeholder: 'Title...',
                        dataTracked: null,
                      },
                    },
                    {
                      type: 'caption',
                      attrs: {
                        placeholder: 'Caption...',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'A figure with a caption',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listing',
                  attrs: {
                    id: '',
                    contents: '',
                    language: '',
                    languageKey: 'null',
                    isExpanded: false,
                    isExecuting: false,
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'figure_element',
              attrs: {
                figureLayout: '',
                figureStyle:
                  'MPFigureStyle:12916784-C8A2-414E-919D-490172E82B25',
                id: 'MPFigureElement:B32BDEC8-E816-4946-C0BB-0404AF2F0C29',
                label: '',
                sizeFraction: 0,
                suppressCaption: true,
                suppressTitle: true,
                dataTracked: null,
              },
              content: [
                {
                  type: 'figure',
                  attrs: {
                    id: 'MPFigure:AD65D628-A904-4DC4-A026-F8F4C08F6557',
                    src: 'chemoji/chemoji7.png',
                    contentType: 'image/png',
                    dataTracked: null,
                  },
                },
                {
                  type: 'figcaption',
                  attrs: {
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'caption_title',
                      attrs: {
                        placeholder: 'Title...',
                        dataTracked: null,
                      },
                    },
                    {
                      type: 'caption',
                      attrs: {
                        placeholder: 'Caption...',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'A figure with hidden caption',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listing',
                  attrs: {
                    id: '',
                    contents: '',
                    language: '',
                    languageKey: 'null',
                    isExpanded: false,
                    isExecuting: false,
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'table_element',
              attrs: {
                id: 'MPTableElement:82BD8BAF-D136-4536-AD9C-92C30B9D7315',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                tableStyle: 'MPTableStyle:08C0E93B-848D-491F-8EB2-A8A0B17714BA',
                label: '',
                suppressCaption: false,
                suppressTitle: true,
                suppressFooter: false,
                suppressHeader: false,
                expandListing: false,
                dataTracked: null,
              },
              content: [
                {
                  type: 'table',
                  attrs: {
                    id: 'MPTable:509A944E-994C-4867-AE55-593628C5DBD5',
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_header',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Header 1',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'text',
                              text: 'Table Header',
                            },
                          ],
                        },
                        {
                          type: 'table_header',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Header 2',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'text',
                              text: 'Table Header',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'text',
                              text: 'Table Data',
                            },
                          ],
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'text',
                              text: 'Table Data',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'text',
                              text: 'Table Data',
                            },
                          ],
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'text',
                              text: 'Table Data',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Footer 1',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'text',
                              text: 'Table Footer',
                            },
                          ],
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Footer 2',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'text',
                              text: 'Table Footer',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'figcaption',
                  attrs: {
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'caption_title',
                      attrs: {
                        placeholder: 'Title...',
                        dataTracked: null,
                      },
                    },
                    {
                      type: 'caption',
                      attrs: {
                        placeholder: 'Caption...',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'A table',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listing',
                  attrs: {
                    id: '',
                    contents: '',
                    language: '',
                    languageKey: 'null',
                    isExpanded: false,
                    isExecuting: false,
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'table_element',
              attrs: {
                id: 'MPTableElement:E0D445B4-18C4-43D3-97B3-1076A7BB5CF4',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                tableStyle: 'MPTableStyle:08C0E93B-848D-491F-8EB2-A8A0B17714BA',
                label: '',
                suppressCaption: false,
                suppressTitle: true,
                suppressFooter: false,
                suppressHeader: true,
                expandListing: false,
                dataTracked: null,
              },
              content: [
                {
                  type: 'table',
                  attrs: {
                    id: 'MPTable:7E83812B-A759-4D38-C1C5-F6507D2FC2A9',
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_header',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Header 1',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                          content: [
                            {
                              type: 'text',
                              text: 'Table Header',
                            },
                          ],
                        },
                        {
                          type: 'table_header',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Header 2',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Footer 1',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Footer 2',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'figcaption',
                  attrs: {
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'caption_title',
                      attrs: {
                        placeholder: 'Title...',
                        dataTracked: null,
                      },
                    },
                    {
                      type: 'caption',
                      attrs: {
                        placeholder: 'Caption...',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'A table with hidden header',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listing',
                  attrs: {
                    id: '',
                    contents: '',
                    language: '',
                    languageKey: 'null',
                    isExpanded: false,
                    isExecuting: false,
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'table_element',
              attrs: {
                id: 'MPTableElement:1DF69096-DBA3-47B0-B8C2-E06491E4C655',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                tableStyle: 'MPTableStyle:08C0E93B-848D-491F-8EB2-A8A0B17714BA',
                label: '',
                suppressCaption: false,
                suppressTitle: true,
                suppressFooter: true,
                suppressHeader: false,
                expandListing: false,
                dataTracked: null,
              },
              content: [
                {
                  type: 'table',
                  attrs: {
                    id: 'MPTable:2A2413E2-71F5-4B6C-F513-7B44748E49A8',
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_header',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Header 1',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_header',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Header 2',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Footer 1',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Footer 2',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'figcaption',
                  attrs: {
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'caption_title',
                      attrs: {
                        placeholder: 'Title...',
                        dataTracked: null,
                      },
                    },
                    {
                      type: 'caption',
                      attrs: {
                        placeholder: 'Caption...',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'A table with hidden footer',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listing',
                  attrs: {
                    id: '',
                    contents: '',
                    language: '',
                    languageKey: 'null',
                    isExpanded: false,
                    isExecuting: false,
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'table_element',
              attrs: {
                id: 'MPTableElement:89CF51B2-A20C-4AB9-CBD9-F47DAF167DAA',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                tableStyle: 'MPTableStyle:08C0E93B-848D-491F-8EB2-A8A0B17714BA',
                label: '',
                suppressCaption: false,
                suppressTitle: true,
                suppressFooter: false,
                suppressHeader: false,
                expandListing: false,
                dataTracked: null,
              },
              content: [
                {
                  type: 'table',
                  attrs: {
                    id: 'MPTable:6C045963-404A-4E1E-FF81-B40E9772A6A6',
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_header',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Header 1',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_header',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Header 2',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Data',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                    {
                      type: 'table_row',
                      attrs: {
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Footer 1',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                        {
                          type: 'table_cell',
                          attrs: {
                            colspan: 1,
                            rowspan: 1,
                            colwidth: null,
                            placeholder: 'Footer 2',
                            valign: null,
                            align: null,
                            scope: null,
                            style: null,
                            dataTracked: null,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'figcaption',
                  attrs: {
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'caption_title',
                      attrs: {
                        placeholder: 'Title...',
                        dataTracked: null,
                      },
                    },
                    {
                      type: 'caption',
                      attrs: {
                        placeholder: 'Caption...',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'A table with hidden caption',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'listing',
                  attrs: {
                    id: '',
                    contents: '',
                    language: '',
                    languageKey: 'null',
                    isExpanded: false,
                    isExecuting: false,
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'equation_element',
              attrs: {
                id: 'MPEquationElement:3896A81A-D43B-483F-B990-F64518A940D1',
                label: 'Equation 1',
                dataTracked: null,
              },
              content: [
                {
                  type: 'equation',
                  attrs: {
                    id: 'MPEquation:C900DDA4-BE45-4AF6-8C9F-CA0AA5FCC403',
                    contents:
                      '<mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML"><mml:mi>ρ</mml:mi><mml:mi>ρ</mml:mi></mml:math>',
                    format: 'mathml',
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'listing_element',
              attrs: {
                id: 'MPListingElement:160785A9-4BC0-4C55-C4DE-AF5F4D858DCE',
                suppressCaption: false,
                suppressTitle: true,
                dataTracked: null,
              },
              content: [
                {
                  type: 'listing',
                  attrs: {
                    id: 'MPListing:4D688DCF-29CD-40CC-93BD-2B13CD883257',
                    contents: "// a JavaScript code block\n\nconst x = 'y'",
                    language: 'JavaScript',
                    languageKey: 'javascript',
                    isExpanded: false,
                    isExecuting: false,
                    dataTracked: null,
                  },
                },
                {
                  type: 'figcaption',
                  attrs: {
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'caption_title',
                      attrs: {
                        placeholder: 'Title...',
                        dataTracked: null,
                      },
                    },
                    {
                      type: 'caption',
                      attrs: {
                        placeholder: 'Caption...',
                        dataTracked: null,
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:345B8B57-2E5E-45ED-E587-4EAAC2BD63E9',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'An inline equation: ',
                },
                {
                  type: 'inline_equation',
                  attrs: {
                    dataTracked: null,
                    id: 'inline-formula-1',
                    contents:
                      '<mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML"><mml:mi>ρ</mml:mi><mml:mi>ρ</mml:mi></mml:math>',
                    format: 'mathml',
                  },
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:6B6DBF43-F7B2-404C-89DD-0EC1E1442B27',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'A cross-reference to a figure: ',
                },
                {
                  type: 'cross_reference',
                  attrs: {
                    rids: [
                      'MPFigureElement:A5D68C57-B5BB-4D10-E0C3-ECED717A2AA7',
                    ],
                    label: 'Figure 1',
                    customLabel: '',
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:41B99DAB-F86C-477F-D36C-2B8590B5DAD0',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'A cross-reference to a table: ',
                },
                {
                  type: 'cross_reference',
                  attrs: {
                    rids: ['MPTable:509A944E-994C-4867-AE55-593628C5DBD5'],
                    label: 'Table 1',
                    customLabel: '',
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:C8A173A4-DF32-4242-E800-28A1AE5B48B8',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'A cross-reference to an equation: ',
                },
                {
                  type: 'cross_reference',
                  attrs: {
                    rids: ['MPEquation:C900DDA4-BE45-4AF6-8C9F-CA0AA5FCC403'],
                    label: 'Equation 1',
                    customLabel: '',
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:CB7347E5-8502-4667-82B9-51104BB1FEDB',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'citation',
                  attrs: {
                    id: 'MPCitation:C1BA9478-E940-4273-CB5C-0DDCD62CFBF2',
                    rids: [
                      'MPBibliographyItem:8C394C86-F7B0-48CE-D5BC-E7A10FCE7FA5',
                    ],
                    contents: 'A hyperlink',
                    selectedText: '',
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'paragraph',
              attrs: {
                id: 'MPParagraphElement:3708E8C7-441C-4502-8BFC-D3A2059CEF8B',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                placeholder: '',
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'A footnote:',
                },
                {
                  type: 'inline_footnote',
                  attrs: {
                    rids: ['MPFootnote:B1589279-0F3B-472B-BF11-3F59D6B65791'],
                    contents: '1',
                    dataTracked: null,
                  },
                },
              ],
            },
            {
              type: 'footnotes_element',
              attrs: {
                id: 'MPFootnotesElement:4CD7CE08-0880-46BD-FF83-52E32AEFAC3E',
                kind: 'footnote',
                paragraphStyle:
                  'MPParagraphStyle:76353811-8E1D-4D11-A1B5-C960C9EEEFCD',
                dataTracked: null,
              },
              content: [
                {
                  type: 'footnote',
                  attrs: {
                    id: 'MPFootnote:B1589279-0F3B-472B-BF11-3F59D6B65791',
                    kind: 'footnote',
                    paragraphStyle: '',
                    placeholder: '',
                    dataTracked: null,
                  },
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        id: '',
                        paragraphStyle: '',
                        placeholder: '',
                        dataTracked: null,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'This is a footnote.',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'backmatter',
      attrs: {
        id: '',
        placeholder: ' ',
      },
      content: [
        {
          type: 'bibliography_section',
          attrs: {
            id: 'MPSection:E07B0D52-9642-4D58-E577-26F8804E3DEE',
            dataTracked: null,
          },
          content: [
            {
              type: 'section_title',
              attrs: {
                dataTracked: null,
              },
              content: [
                {
                  type: 'text',
                  text: 'Bibliography',
                },
              ],
            },
            {
              type: 'bibliography_element',
              attrs: {
                id: 'MPBibliographyElement:5987B3BA-D894-4700-90D6-114E20B9F3B1',
                contents: '',
                paragraphStyle:
                  'MPParagraphStyle:7EAB5784-717B-4672-BD59-8CA324FB0637',
                dataTracked: null,
              },
              content: [
                {
                  type: 'bibliography_item',
                  attrs: {
                    id: 'MPBibliographyItem:8C394C86-F7B0-48CE-D5BC-E7A10FCE7FA5',
                    title: 'A hyperlink',
                    paragraphStyle: '',
                    dataTracked: null,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'comments',
      attrs: {
        id: '',
      },
    },
  ],
} as JSONProsemirrorNode
