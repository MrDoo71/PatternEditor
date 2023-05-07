# PatternEditor
JS pattern editor 

This javascript library is intended to be compatible with Seamly2D / Valentina patterns.  

Sealmy2D (a fork from Valentina) is an excellent open source (GPL) pattern drawing programme. 

This library uses the fantastic kld-intersections to do most of the geometric wizardry, but also uses D3 and the browser's native SVG ability.  This library is really no more than a mapping between Seamly2D/Valentina drawing concepts expressed as JSON and these other libraries.

This is a **ground-up implementation** and is **not** distributed under the GPL licence.  The source of Seamly2D/Valentina (which is GPL) has not been investigated in any way in the making of this library; the behaviour of each drawing tool and its XML representation was investigated in order to produce a file-compatible library.

Acknowledgement and thanks must go to all the contributors and leaders of the Seamly2D/Valentina projects, especially Susan Spencer and Roman Telezhinsky for the development of the Seamly2D/Valentina application. 

Acknowledgement and thanks must also go to Kevin Lindsey (aka thelonious) for [kld-intersections](https://github.com/thelonious/kld-intersections) for the aforementioned geometric wizardry.  Thanks also to Pomax for the fantastic online book [A Primer on Bézier Curves](https://pomax.github.io/BezierInfo-2/).

The input to this library is a JSON representation (and simplification) of the XML format that Seamly2D/Valentina uses to save patterns. 

The pattern sharing website [https://my-pattern.cloud/](https://my-pattern.cloud/) can import Seamly2D/Valentina .val and .vit files and uses this library to display a representation of the pattern in the browser.

Static test files: [https://my-pattern.cloud/patternEditor/tests/test.html](https://my-pattern.cloud/patterneditor/tests/test.html)




### Contributing
All contributions welcome provided that:

- you licence all contributions using the MIT licence (so that there is the flexibility to move to the MIT licence for the entire project in the future)
- that you're free to licence your code under MIT; i.e. that you have not read the source code for the equivalent areas in the Seamly2D/Valentina GPL projects (unless you are the contributor in that area and hold the copyright and there is no legal obstacle).
- the contributions don't break compatibility with Seamly2D/Valentina.



