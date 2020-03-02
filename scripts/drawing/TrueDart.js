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
        var d = this.data;

        if (typeof this.point1 === "undefined")
            this.point1 = this.patternPiece.getObject(d.point1);
        if (typeof this.point2 === "undefined")
            this.point2 = this.patternPiece.getObject(d.point2);
        if (typeof this.point3 === "undefined")
            this.point3 = this.patternPiece.getObject(d.point3);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.patternPiece.getObject(d.p1Line1);
        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.patternPiece.getObject(d.p2Line1);

        var lineD2A1 = new GeoLine( this.point2.p, this.p1Line1.p );
        var lineD2D1 = new GeoLine( this.point2.p, this.point1.p );    
        var angleA1D2D1 = lineD2A1.angleRad() - lineD2D1.angleRad();
        var lengthD2TD1 = Math.cos( angleA1D2D1 ) * lineD2A1.length;
        this.td1 = this.point2.p.pointAtDistanceAndAngleRad( lengthD2TD1, lineD2D1.angleRad() );
    
        var lineD2A2 = new GeoLine( this.point2.p, this.p2Line1.p );
        var lineD2D3 = new GeoLine( this.point2.p, this.point3.p );    
        var angleA1D2D3 = lineD2D3.angleRad() - lineD2A2.angleRad();
        var lengthD2TD3 = Math.cos( angleA1D2D3 ) * lineD2A2.length;
        this.td3 = this.point2.p.pointAtDistanceAndAngleRad( lengthD2TD3, lineD2D3.angleRad() );

        //Nb. this.data.trueDartResult1 and trueDartResult2 give the names of the dart points generated.

        bounds.adjust(this.td1);
        bounds.adjust(this.td3);
    }


    draw( g, isOutline ) {
        //no!
        //this.drawDotForSpecificPoint( g, isOutline, this.td3 );
        //this.drawLabel( g, isOutline );
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
        //TODO these could get captured automaticallly if, in calculate, we did getObjectAndSetDependency( blah, this )
        dependencies.add( this, this.point1 );
        dependencies.add( this, this.point2 );
        dependencies.add( this, this.point3 );
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
    }    

}
