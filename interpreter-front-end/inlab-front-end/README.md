# inlab — front end

Everything Interpreter needs that **your Figma does not draw**.

The split is by provenance, not by quality. `interpreter-front-end/src` is
transcription: every value in it comes from a frame, and where a frame and a
guess disagree, the frame wins. This folder is the opposite — screens and
behaviours reasoned out from the handoff prototype and the Cseudocode design
system, built so the product can be used end to end before every screen has been
designed.

Keeping them apart means a design review can be told exactly which pixels are
somebody's decision and which are mine. When a frame arrives for something in
here, it moves across and stops being a guess.

## What lives here

Nothing yet. This folder is created with the module so there is never a moment
where a guess has nowhere to go but `src`.

## The rule

A file belongs here if answering "where did this measurement come from?" is
anything other than "a frame". Everything here is provisional by construction:
it is meant to be replaced, and replacing it should never mean untangling it
from transcribed work.
