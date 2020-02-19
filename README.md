# PatternEditor
JS pattern editor 

This javascript library is intended to be compatible with Seamly2D / Valentina patterns.  

This library uses the fantastic kld-intersections to do most of the geometric wizardry, but also uses D3 and the browser's native SVG ability.  This library is really on more than a mapping between Seamly2D/Valentina drawing concepts expressed as JSON and these other libraries.

This is a ground-up implementation and distributed under the MIT licence.  The source of Seamly2D (which is GPL) has not investigated in any way in the making of this library; the behaviour of each drawing tool and its XML representation was investigated in order to produce a file compatible library.

Acknowledgement and thanks must go to all the contributors and leaders of the Seamly2D/Valentina projects, especially Susan Spencer and Vlad XXXXXX for the development of the Seamly2D/Valentina application. 

The input to this library is a JSON representation (and simplification) of the XML format of a Seamly2D/Valentina pattern. 

The pattern sharing website https://my-pattern.cloud/ can import Seamly2D/Valentina .val and .vit files and uses this library to display a representation of the pattern in the browser.




Contributing:
All contributions welcomme provided that:
. you licence all contributions using the MIT licence
. that you're free to licence your code under MIT; i.e. that you have not read the source code for the equivalent areas in the Seamly2D/Valentina GPL projects (unless you are the contributor in that area and hold the copyright)
. the contributions don't break compatibility with Seamly2D/Valentina.



