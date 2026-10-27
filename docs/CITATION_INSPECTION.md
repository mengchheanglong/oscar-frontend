# Citation inspection

The inspector separates the saved exact model-used source body, the current
permitted indexed chunk and the original source link/page locator. These are
different completeness boundaries. A chunk can be shorter than a whole PDF page.

Historical turns without an exact excerpt stay explicitly uncaptured. A current
matching passage cannot reconstruct historical model input. When historical
truncation flags are absent, a matching source revision and verified preview
prefix can establish that the preview is shorter. Foreign documents, stale
revisions, unrelated excerpts and incorrect character counts cannot establish it.
Character counts use Unicode code points consistently with Knowledge.

The authenticated main-app proxy must be running after the backend update.
Missing, stale, forbidden and excluded passages remain explicit errors rather
than silently substituting another version. Original private PDFs are not made
public by the inspector. The source link is not an embedded full PDF viewer.

Verification for the correction: 37 client tests, lint, typecheck and production
build passed. Browser acceptance is recorded separately in the private quality
pilot report; builds alone do not prove the signed-in user flow.
