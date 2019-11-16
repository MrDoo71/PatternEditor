/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class SplinePathInteractive extends DrawingObject {

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        var d = this.data;

        if ( typeof this.nodes === "undefined" )
        {
            this.nodes = [];
            for( var i=0; i< d.pathNode.length; i++ )
            {
                var pathNode = this.data.pathNode[i];

                pathNode.point   = this.patternPiece.getObject( pathNode.point );
                pathNode.angle1  = this.patternPiece.newFormula( pathNode.angle1 ); 
                pathNode.length1 = this.patternPiece.newFormula( pathNode.length1 ); 
                pathNode.angle2  = this.patternPiece.newFormula( pathNode.angle2 ); 
                pathNode.length2 = this.patternPiece.newFormula( pathNode.length2 );

                this.nodes.push( { inAngle:   pathNode.angle1.value(),
                                   inLength:  pathNode.length1.value(),
                                   point:     pathNode.point.p,
                                   outAngle:  pathNode.angle2.value(),
                                   outLength: pathNode.length2.value() } );
            }
        }

        this.curve = new GeoSpline( this.nodes );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;
        bounds.adjust( this.p );

        //Bounds will already have been adjusted for each node
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var p = g.append("path")
              .attr("d", this.curve.svgPath() )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        //Where should we draw the label? half way along the curve? 
        this.drawLabel(g, this);
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html() {
        var html = '<span class="ps-name">' + this.data.name + '</span>: curved path:';// from ' + this.startPoint.data.name + " angle " + this.angle1.value() + " length " + this.length1.value()
            //+ " to " + this.endPoint.data.name + " angle " + this.angle2.value() + " length " + this.length2.html();

        var d = this.data;
        for( var i=0; i< d.pathNode.length; i++ )
        {
            if ( i>0 )
                html+= "; ";
         
            html += "<br />";    
            html += d.pathNode[i].point.data.name + " " + 
                    d.pathNode[i].angle1.html() + " " + 
                    d.pathNode[i].length1.html() + " " + 
                    d.pathNode[i].angle2.html() + " " + 
                    d.pathNode[i].length2.html();
        }

        return html;
    }

    
    setDependencies( dependencies )
    {
        for( var i=0; i< this.data.pathNode.length; i++ )
        {
            var pathNode = this.data.pathNode[i];
            dependencies.add( this, pathNode.point );
            dependencies.add( this, pathNode.angle1 );
            dependencies.add( this, pathNode.angle2 );
            dependencies.add( this, pathNode.length1 );
            dependencies.add( this, pathNode.length2 );
        }        
    }    
}
