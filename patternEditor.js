//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 

var gInteractionPrefix; 

function kinodbGlue( dataAndConfig, ptarget, options )
{
    //Remove the svg if called by graph_kill
    if ( dataAndConfig === null )
    {
        var parent = document.getElementById(ptarget).parentNode;
        var child = document.getElementById(ptarget);
        parent.removeChild(child);
        return ;
    } 
      
    //This is a graph initialisation
    gInteractionPrefix = options.interactionPrefix;    
    
    function newkvpSet(noRefresh)
    {
        var kvp = { } ;
        kvp.kvps = new Array() ;

        kvp.add = function (k, v)
        {
            this.kvps.push ( {k: k, v: v} ) ;
        } ;

        kvp.toString = function (p)
        {
            var r = '' ;

            for (var i = 0 ; i < this.kvps.length ; i++)
            {
                r += '&' + p + this.kvps[i].k + '=' + this.kvps[i].v ;
            }

            return r ;
        } ;

        if (noRefresh)
            kvp.add("_noRefresh", -1) ;

        return kvp ;
    }
    
    // show menu on right-click.
    var contextMenu = function(d) {
   		d3.event.preventDefault() ;
    	var v = newkvpSet(false) ;
    	v.add("x", d.x) ;   
    	v.add("y", d.y) ;    
    	goGraph( gInteractionPrefix + ':' + d.data.contextMenu ,
    			 d3.event, 
    			 v ) ;
    }      
    
    //Convert the JSON data into Javascript drawing objects
    var patternData = dataAndConfig.pattern;
    var patternPiece1 = new PatternPiece( patternData.patternPiece[0] );
    var targetdiv = d3.select( "#" + ptarget );
    
    doDrawing( targetdiv, patternPiece1, contextMenu );
    
    doTable( targetdiv, patternPiece1, contextMenu );
}


//Do the drawing... (we've added draw() to each drawing object.
function doDrawing( graphdiv, patternPiece1, contextMenu )
{
    var margin = 25; 
    var width = 400;
    var height = 600;

    var svg = graphdiv.append("svg")
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

    var transformGroup = svg.append("g")
                            .attr("transform", "translate(" + ( margin ) + "," + ( margin ) + ")");

    var scaleX = width / ( patternPiece1.bounds.maxX - patternPiece1.bounds.minX );                   
    var scaleY = height / ( patternPiece1.bounds.maxY - patternPiece1.bounds.minY );           
    
    if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
        scale = scaleX > scaleY ? scaleY : scaleX;
    else if ( isFinite( scaleX ) )
        scale = scaleX;
    else
        scale = 1;

    var transformGroup = transformGroup.append("g")
                               .attr("transform", "scale(" + scale + "," + scale + ")");

    var transformGroup = transformGroup.append("g")
                               .attr("transform", "translate(" + ( ( -1.0 * patternPiece1.bounds.minX ) ) + "," + ( ( -1.0 * patternPiece1.bounds.minY ) ) + ")");

    var onclick = function(d) {
        d3.event.preventDefault() ;
        console.log( "Click! " );
        $( ".j-active" ).removeClass("j-active");
        $(this).addClass("j-active");
        d.tableSvg.each( function(d,i) {
            $(this).addClass("j-active");
        });
        //$( d.tableSvg ).addClass("j-active");
    }

    var a = transformGroup.selectAll("g");    
    a = a.data( patternPiece1.drawingObjects );
    a.enter()
     .append("g")
     .each( function(d,i) {
        var g = d3.select( this );
        //d.calculate();

        d.drawingSvg = g;

        g.on("contextmenu", contextMenu);
        g.on("click", onclick);

        if ( typeof d.draw === "function" )
            d.draw( g );
    });

    //Enable Pan and Zoom
    //https://observablehq.com/@d3/zoom
    //TODO if a point is selected then zoom with it as the focus
    //SEE https://bl.ocks.org/mbostock/a980aba1197350ff2d5a5d0f5244d8d1
    function zoomed() {
        transformGroup.attr("transform", d3.event.transform);
    }; 
    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([1, 8])
        .on("zoom", zoomed));

}


/*
 * Curve that connects items in the table.
 */
function curve(link) {
    var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
        x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;

    var dx = x0 - x1,
        dy = y0 - y1,
        l = Math.log( Math.abs(dy /30 ) ) * 50;

   // return "M" + x0 + "," + y0
     //   + "A" + dy*5 + "," + dy * 1.1 + " 0 0 1 "
       // + x1 + "," + y1;

        var path = d3.path();
        path.moveTo( x0, y0 );
        path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
        return path;                      
  }


function doTable( graphdiv, patternPiece1, contextMenu )
{
    var margin = 25; 
    var width = 400;
    var height = 600;
    var itemHeight = 30;
    var itemMargin = 8;
    var itemWidth = 300;
    var ypos = -itemHeight;
    var seq = 1; //TODO get these in the XML as data?

    var svg = graphdiv.append("svg")
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));    

    a = svg.selectAll("g");
    a = a.data( patternPiece1.drawingObjects );
    a.enter()        
     .append("g")
     .each( function(d,i) {
        var g = d3.select( this );
        //d.calculate();

        g.append("rect")
         .attr( "x", 0 )
         .attr( "y", function (d) { ypos += itemHeight + itemMargin; return ypos } )
         .attr( "width", itemWidth )
         .attr( "height", itemHeight );

        g.attr( "class", "j-item") ;
        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * itemHeight );

        g.append( "foreignObject" )
         .attr( "x", 5 )
         .attr( "y", function (d) { 
             return ypos;// + 5;// + (0.5 * itemHeight); 
         } )
         .attr( "width", "290" )
         .attr( "height", "100" )
         //.attr( "requiredFeatures", "http://www.w3.org/TR/SVG11/feature#Extensibility" )
         //.append( "body" )
         .append( "xhtml:div" )
         .attr( "style", "color:black" )
         //.attr( "xmlns", "http://www.w3.org/1999/xhtml" )
         .html( d.html() );// "hello world <a href=\"www.google.co.uk\">google</a>" );

        g.on("contextmenu", contextMenu);
    });                                   

    var linkData = [ { source: patternPiece1.getObject("A"), target: patternPiece1.getObject("A1")},
                     { source: patternPiece1.getObject("A"), target: patternPiece1.getObject("A2")},
                     { source: patternPiece1.getObject("A1"), target: patternPiece1.getObject("A2")},
                     { source: patternPiece1.getObject("A"), target: patternPiece1.getObject("X")}  ];

    var links = svg.append("g")
                    .attr("class", "links")
                    .selectAll("path")
                    .data(linkData)
                    .enter().append("path")
                    .attr("class","link")
                    .attr("d", curve);

}