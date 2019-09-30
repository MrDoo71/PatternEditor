define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});

class ArcSimple extends DrawingObject {

    //center
    //angle1
    //angle2
    //radius 

    constructor(data) {
        super(data);

        //TODO output a useful arcID
        if ( typeof this.data.name === "undefined" )
            this.data.name = "arcX";
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle1 = this.patternPiece.newFormula(d.angle1);
        if (typeof this.angle2 === "undefined")
            this.angle2 = this.patternPiece.newFormula(d.angle2);
        if (typeof this.radius === "undefined")
            this.radius = this.patternPiece.newFormula(d.radius);

        this.arc = new GeoArc( this.center.p, this.radius.value(), this.angle1.value(), this.angle2.value() );

        var arcData = this.arc.centeredToSVG( this.center.p.x, this.center.p.y, 
            this.radius.value(), this.radius.value(), 
            -this.angle1.value(), -(this.angle1.value() + this.angle2.value()) /2, 0 ); 

        this.p = new GeoPoint( arcData.x1, arcData.y1 );

        //This bound setting is inaccurate. Really we should look at the bounds set
        //by the start and end points, and by the intersection of the x and y axis with the curve
        //(which may be multiple)
        let east  = this.center.p.pointAtDistanceAndAngle( this.radius.value(), 0   *Math.PI / 180);
        let north = this.center.p.pointAtDistanceAndAngle( this.radius.value(), 90  *Math.PI / 180);
        let west  = this.center.p.pointAtDistanceAndAngle( this.radius.value(), 180 *Math.PI / 180);
        let south = this.center.p.pointAtDistanceAndAngle( this.radius.value(), 270 *Math.PI / 180);

        bounds.adjust( east );
        bounds.adjust( north );
        bounds.adjust( west );
        bounds.adjust( south );
    }

    
    asShapeInfo()
    {
        return this.arc.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var arcPath = d3.path();
        arcPath.arc( this.center.p.x, this.center.p.y, 
                     this.radius.value(), 
                     -this.angle1.value() * Math.PI / 180, -this.angle2.value() * Math.PI / 180, true );
        
        g.append("path")
              .attr("d", arcPath )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        //Where should we draw the label? half way along the arc?
        //this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: arc with center ' + this.data.center + " radius " + this.data.radius.html() + " from angle " + this.data.angle1.html() + " to " + this.data.angle2.html();
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.radius );
    }    
}
