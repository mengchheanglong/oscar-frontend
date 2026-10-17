# Response presentation reference study

Inspected 2026-10-17. This records research, not completed product changes.

## Method and access limits

Fetched the public pages for ChatGPT, Grok, Claude, and Google Gemini with
Firecrawl, including content and styling metadata. Attempted their live browser
interfaces in separate guest sessions. Sent only this generic test prompt to
Gemini and Grok:

> Explain a knowledge graph in two short paragraphs, three bullet points, a small comparison table, and a short Python example.

| Product | Actual access | Evidence usable for this study |
| --- | --- | --- |
| ChatGPT | Browser verification gate; scraper returned a guest shell/error | Official search documentation and its source-interaction examples |
| Grok | Public composer; submitting the prompt led to a sign-up gate | Public shell, official research-synthesis documentation, and the user's supplied screenshots |
| Claude | Browser verification gate; scraper returned sign-in | Official web-search and personalization documentation |
| Gemini | Complete live guest response | Actual answer DOM, computed styles, citation controls, table, code block, and response actions |

Do not treat shell/login font measurements as answer typography. No authenticated
answer DOM was obtained for ChatGPT, Grok, or Claude. Their exact current answer
font sizes, widths, and spacing remain unverified. The old Claude styles article
redirected to a 404, so it is not evidence for current app behavior.

## Verified reference behaviors

### ChatGPT

The official [search guide](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt)
describes inline citations that open sources, desktop citation hover previews,
and a Sources control for the fuller source list. The useful design principle
is progressive disclosure: keep evidence near its claim without expanding the
full source record into the reading flow.

### Grok

The official [research-synthesis page](https://x.ai/grok/use-cases/research-synthesis)
describes sections, supporting evidence, comparison tables, and citations tied
to claims. This supports structured answers when the question calls for them;
it does not establish one compulsory template for every reply. Live answer
typography was not available in this session.

### Claude

The official [web-search guide](https://support.claude.com/en/articles/10684626-enable-and-use-web-search)
describes conversational responses with direct source citations and links.
The current [personalization guide](https://support.claude.com/en/articles/10185728-understanding-claude-s-personalization-features)
separates instructions/context from controls for response tone and format.
Exact answer layout was not directly observed; do not infer it from the login
page or from Claude Code output styles.

### Gemini

Observed in a live guest response at [Gemini](https://gemini.google.com/app):

- Plain assistant text on the conversation surface, with substantial whitespace
  between sections and compact source labels adjacent to claims.
- Real paragraphs, a three-item list, semantic headings, and a three-column
  comparison table. The table used restrained horizontal separators.
- A distinct code surface with a language label, Copy code, and Download code.
- Response-level Redo, Copy, and additional options after the answer.
- Source controls expose accessible names describing their source providers.

Computed styles from this particular desktop response:

| Element | Observed value |
| --- | --- |
| Prose font | Google Sans Flex / Google Sans / Helvetica Neue / sans-serif |
| Paragraph text | 17px, weight 400, line-height 24px |
| Paragraph separation | 16px before the following paragraph |
| Section heading | 20px, weight 470, line-height 24px |
| Section separation | 40px before the inspected h3 headings |
| List item separation | 12px after the first item |
| Prose/table width | 708px in the sampled desktop layout |

These are sample measurements, not universal Gemini specifications. Its
[source documentation](https://support.google.com/gemini/answer/14143489?hl=en)
also confirms sources within/below responses and a side panel for details.

## Continuum findings from the current code

- `src/components/markdown-content.tsx` is a custom line-oriented renderer.
  It creates separate paragraphs for each line, decorative heading spans,
  individual div-based list rows, large Evidence #N pills, and small table/code
  text. Unclosed code fences do not flush their buffered content.
- `src/app/workspace-theme.css` already overrides some renderer classes to
  16px prose and 18px headings. Further changes should consolidate these rules,
  rather than layering more overrides onto conflicting component classes.
- `src/app/assistant/page.tsx` already has Sources disclosure, individual source
  inspection/open actions, response copy, and Remember. Inline evidence pills
  currently render as spans, so they do not open the associated source.
- Backend `src/modules/ai/context/context-assembler.ts` explicitly requests
  bulleted lists with bold term prefixes. Several specialist modes also demand
  fixed report sections. CSS alone cannot change those generation habits.

## Proposed Continuum direction

The following values are our design choices informed by the references; they
are not claimed measurements of all four products.

1. Use one readable answer column around 720–760px on desktop, fluid on mobile;
   normal 16px prose with approximately 1.7 line-height.
2. Use connected paragraphs by default, with about 16px paragraph separation.
   Reserve headings for longer answers and use modest 18–20px section headings
   with 28–32px space before them. Remove decorative heading glyphs.
3. Use semantic lists with ordinary neutral markers. Allow nested lists and
   continuation paragraphs. Avoid requiring bold prefixes on every item.
4. Replace repeated Evidence #N labels with compact source controls. Resolve
   evidence numbers against the response's actual citation metadata, keep
   project attribution, and reuse the existing inspector. Unknown references
   must not pretend to be verified or link to a guessed source.
5. Use readable, horizontally scrollable tables and code blocks; contain wide
   content within the answer. Keep code language and copy feedback visible.
   Code must remain visible while a closing fence has not yet arrived.
6. Keep response actions quiet below the answer. Preserve working Copy,
   Remember, Sources, and source permissions; do not add unsupported feedback,
   regeneration, export, or download buttons solely to imitate a reference.
7. Adjust backend style instructions to answer the question first and choose
   paragraphs, lists, tables, or code according to the request. Keep evidence
   grounding, citation syntax, private-memory boundaries, and permissions intact.

Implementation verification should cover prose, nested/ordered/task lists,
tables, incomplete code fences, unsafe links/HTML, citation-to-source mapping,
copy success/failure, dark/light themes, mobile overflow, and the agent-artifact
view that shares the Markdown renderer. Research alone does not verify these
product behaviors.
