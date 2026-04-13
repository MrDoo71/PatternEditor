//(c) Copyright 2026 Jason Dore
//
//This library collates the various geometric calclulation requirements
//of the drawing objects into a small number of primitives. 
//
//This library then generally uses other libraries to perform those 
//geometric calculations where they are non trivial
//(e.g. intersection of lines with splines).
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

class PointDrawingObject extends DrawingObject /*abstract*/ {

	//Return [ a, b ] where a and b are the names of the drawing objects at either end of the line
	//This is used when suggesting possible intersection points. 
	getLinePointsNames()
	{
		if ( this.basePoint === undefined )
			console.log("no basepoint");

		return [ this.basePoint.data.name, this.data.name ];
	}

}
