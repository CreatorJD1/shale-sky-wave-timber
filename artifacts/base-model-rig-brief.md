# Base model animation brief

Flat 2D companion body. No shadows and no lighting until the rig works.

Views already in the clean room, same body height: A-pose, T-pose, Left profile, Right profile, Back.

Do not paint new eyes or a new mouth on top of the drawn face. A previous pass drew white circles over her real eyes and a line over her mouth. That is forbidden.

Eyes: separate parts only. Parameters EyeLOpen, EyeROpen (0 closed, 1 open), EyeBallX, EyeBallY (-1 to 1). Her right eye is amber. Her left eye is green. Blink is a lid over the existing eye, not a replacement eye.

Mouth: two parameters only. MouthOpen 0 to 1. MouthForm -1 to 1 (narrow to wide). Shapes must be real mouth drawings, not a stroke pasted on the chin.

Hands: five fingers per hand. Each finger has three joints. The thumb has its own joints. No single hand bone. Parts stay separate so a finger can curl without dragging the palm.

All new parts are flat color on chroma blue, then keyed. No white background.
