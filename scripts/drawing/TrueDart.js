class TrueDart extends DrawingObject {

    //p1Line1  2 points making up the line on which the dart sits. 
    //p2Line1
    //point1 3 points that make up a V shape of the original dart, point1 and point3 lie on the baseline
    //point2
    //point3

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.point1 === "undefined")
            this.point1 = this.drawing.getObject(d.point1);
        if (typeof this.point2 === "undefined")
            this.point2 = this.drawing.getObject(d.point2);
        if (typeof this.point3 === "undefined")
            this.point3 = this.drawing.getObject(d.point3);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.drawing.getObject(d.p1Line1);
        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.drawing.getObject(d.p2Line1);

        const lineD2D1 = new GeoLine( this.point2.p, this.point1.p ); 
        const lineD2D3 = new GeoLine( this.point2.p, this.point3.p );    

        let angleD2D1 = lineD2D1.angleDeg();
        let angleD2D3 = lineD2D3.angleDeg();

        let totalDartAngle = angleD2D1 - angleD2D3;

        //edge case:
        //if D2D1 angle is 10 and D2D3 is 350 (or vice versa) then it would be better to consider D2D3 to be -10. 
        if ( totalDartAngle > 180 )
        {
            angleD2D1 -= 360;
            totalDartAngle = angleD2D1 - angleD2D3;
        }
        else if ( totalDartAngle < -180 ) 
        {
            angleD2D3 -= 360;
            totalDartAngle = angleD2D1 - angleD2D3;
        }

        const halfDartAngle = totalDartAngle /2;

        const pointA1rotated = this.p1Line1.p.rotate( this.point2.p, -halfDartAngle );
        const pointD1rotated = this.point1.p.rotate( this.point2.p, -halfDartAngle );
        const pointA2rotated = this.p2Line1.p.rotate( this.point2.p, halfDartAngle );
        //const pointD2rotated = this.point3.p.rotate( this.point2.p, halfDartAngle );

        const lineA1RA2R = new GeoLine( pointA1rotated, pointA2rotated );
        this.line = lineA1RA2R; //TEMP
        const pointClosure = lineA1RA2R.intersect( new GeoLine( this.point2.p, pointD1rotated ) ); //could equally use pointD2rotated
        this.p = pointClosure; //TEMP

        this.td1 = pointClosure.rotate( this.point2.p, halfDartAngle );
        this.td3 = pointClosure.rotate( this.point2.p, -halfDartAngle );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.td1);
        bounds.adjust(this.td3);
    }


    draw( g, drawOptions ) {
        this.drawLine( g, drawOptions ); //TEMP - though actually handy
        this.drawDot( g, drawOptions ); //TEMP
        this.drawLabel( g, drawOptions ); //TEMP
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + " True darts baseline " + this.refOf( this.p1Line1 )
                + "-" + this.refOf( this.p2Line1 )
                + " original dart " + this.refOf( this.point1 )
                + "-" + this.refOf( this.point2 )
                + "-" + this.refOf( this.point3 );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.point1 );
        dependencies.add( this, this.point2 );
        dependencies.add( this, this.point3 );
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
    }    

}
