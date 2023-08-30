//(c) Copyright 2019-20 Jason Dore
//
//Inspired by the excellent Seamly2D/Valentina pattern drawing software.
//This library is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the Seamly2D/Valentina pattern making systen in order to support the community
//pattern sharing website https://my-pattern.cloud/ . 
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

var selectedObject;
var linksGroup;
var fontsSizedForScale = 1;
var fontResizeTimer;
var updateServerTimer;
var timeOfLastTweak;
var doDrawingAndTable;

function drawPattern( dataAndConfig, ptarget, graphOptions ) 
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

    if ( ! dataAndConfig.options )
        dataAndConfig.options = {};

    var options = dataAndConfig.options;

    options.interactionPrefix = graphOptions.interactionPrefix;

    var targetdiv = d3.select( "#" + ptarget )
                       .append( "div" )
                       .attr( "class", "pattern-editor" );

    var pattern;
    try {
        pattern = new Pattern( dataAndConfig, graphOptions );            
    } catch ( e ) {
        if ( ! options.thumbnail )
            targetdiv.append("div")
                .attr( "class", "alert alert-warning" )
                .text( "Pattern draw failed.");

        console.log("Failed to load pattern: ", e );

        try {
            const failMessage = 'FAIL:' + e.message;
            const failMessageHash = CryptoJS.MD5( failMessage ).toString();
            if (    ( options.returnSVG !== undefined ) 
                 && ( dataAndConfig.options.currentSVGhash !== failMessageHash )
                 && ( options.returnID ))
            {
                var kvpSet = newkvpSet(true);
                kvpSet.add( 'svg', failMessage );
                kvpSet.add( 'id', options.returnID ) ;
                goGraph( options.interactionPrefix + ':' + options.returnSVG, fakeEvent(), kvpSet);
            }
        } catch ( f ) {
        }
        
        return;
    }
        

    if ( options.allowPanAndZoom === undefined )
        options.allowPanAndZoom = true;

    if ( options.showFormulas === undefined )
        options.showFormulas = true;

    if ( options.drawingTableSplit === undefined )
        options.drawingTableSplit = 0.66;

    if ( options.skipDrawing === undefined )
        options.skipDrawing = false;

    if ( options.skipPieces === undefined )
        options.skipPieces = false;

    if ( options.thumbnail === undefined )
        options.thumbnail = false;

    if ( options.interactive === undefined )
        options.interactive = ! options.thumbnail;

    if ( options.lastMixedSplit === undefined )
        options.lastMixedSplit = options.drawingTableSplit > 0.0 && options.drawingTableSplit < 1.0 ? options.drawingTableSplit : 0.66;

    if ( ! options.viewOption )
        options.viewOption = [  { "mode":"drawing", "icon": "icon-picture",       "drawingTableSplit": 1.0 },
                                { "mode":"mixed",   "icon": "icon-columns",       "drawingTableSplit": 0.5 },
                                { "mode":"table",   "icon": "icon-align-justify", "drawingTableSplit": 0 } ];

    // show menu on right-click.
    var contextMenu = options.interactive && typeof goGraph === "function" ? function(d) {
        if ( d.contextMenu )
        {
            d3.event.preventDefault() ;
            var v = newkvpSet(false) ;
            v.add("x", d.x) ;   
            v.add("y", d.y) ;    
            goGraph( graphOptions.interactionPrefix + ':' + d.contextMenu ,
                    d3.event, 
                    v ) ;
        }
    } : undefined; //function(d){};     

    options.layoutConfig = { drawingWidth: 400,
                             drawingHeight: 600,
                             drawingMargin: 0,
                             tableWidth: 400,
                             tableHeight: 600,
                             tableMargin: 0 };

    if ( ! options.translateX )                                           
        options.translateX = 0;

    if ( ! options.translateY )                                           
        options.translateY = 0;

    if ( ! options.scale )                                           
        options.scale = 1;

    options.setDrawingTableSplit = function( drawingTableSplit ) { //can be called with a decimal (0.0 - 1.0), a mode ("drawing","mixed","table"), or nothing.

        //TODO if going full-screen and not specifying a split here, then keep the table the same width and give all extra space to the drawing
        
        if ( drawingTableSplit === undefined )
            drawingTableSplit = this.drawingTableSplit;
        else if ( drawingTableSplit === "drawing" )
            drawingTableSplit = 1.0;
        else if ( drawingTableSplit === "mixed" )
            drawingTableSplit = this.lastMixedSplit ? this.lastMixedSplit : 0.5;
        else if ( drawingTableSplit === "table" )
            drawingTableSplit = 0.0;

        if ( drawingTableSplit < 0.05 ) 
        {
            drawingTableSplit = 0.0;
            this.drawingTableSplitMode = "table";
        }
        else if ( drawingTableSplit > 0.95 ) 
        {
            drawingTableSplit = 1.0;
            this.drawingTableSplitMode = "drawing";
        }
        else
        {
            this.drawingTableSplitMode = "mixed";
            this.lastMixedSplit = drawingTableSplit;
        }

        var availableWidth = ( options.maxWidth ) ? options.maxWidth : Math.round( window.innerWidth - 30 -32 ); //30 for resize bar & 32 for scroll bars as not all systems hide scroll bars
        var availableHeight = ( options.maxHeight ) ? options.maxHeight : Math.round( window.innerHeight - targetdiv.node().getBoundingClientRect().top -60/*controlpanel buttons height*/);
        if ( this.fullWindow )
        {
            availableWidth -= 32; //left & right padding 
            availableHeight -= 30;
        }

        //console.log("setDrawingTableSplit availableWidth:" + availableWidth + " fullWindow:" + this.fullWindow + " drawingWidth:" + this.layoutConfig.drawingWidth );
        this.layoutConfig.drawingWidth = availableWidth * drawingTableSplit;
        this.layoutConfig.tableWidth   = availableWidth * (1-drawingTableSplit);
        this.layoutConfig.drawingHeight = availableHeight;
        this.layoutConfig.tableHeight = availableHeight;
        console.log("setDrawingTableSplit split:" + drawingTableSplit + " availableWidth:" + availableWidth + " fullWindow:" + this.fullWindow + " drawingWidth:" + this.layoutConfig.drawingWidth );
        
        if ( this.sizeButtons )
        {
            var drawingTableSplitMode = this.drawingTableSplitMode;
            this.sizeButtons.selectAll("button")
                        .data( this.viewOption )
                        //.enter()
                        //.append("button")
                        .attr( "class",  function(d) { 
                            return d.mode == drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } );
        }

        if ( this.drawingTableSplit != drawingTableSplit )
        {
            this.drawingTableSplit = drawingTableSplit; //so we can call this without a parameter when toggling full size. 
            if ( this.updateServer ) 
                this.updateServer(); 
        }
    };    

    options.updateServer = graphOptions.interactionPrefix && options.update ? function( k, x, y ) {
        if ( k )
        {
//TODO shouldn't this be this. rather than options.  ???

            if (    (options.translateX == x)
                 && (options.translateY == y)
                 && (options.scale == k) )
                 return;

            options.translateX = x;
            options.translateY = y;
            options.scale = k;
        }

        if ( $("div.popover").length )
        {
            console.log("Skipping server update as there is an overlay form. " );
            return;
        }

        console.log("Update server with pan: " + x + "," + y + " & zoom:" + k + " & options");
        var kvpSet = newkvpSet(true) ;
        kvpSet.add('fullWindow', options.fullWindow ) ;
        kvpSet.add('drawingTableSplit', options.drawingTableSplit ) ;
        kvpSet.add('scale', options.scale ) ;
        kvpSet.add('translateX', options.translateX ) ;
        kvpSet.add('translateY', options.translateY ) ;        
        goGraph( options.interactionPrefix + ':' + options.update, fakeEvent(), kvpSet) ;    
    } : undefined;

    if ( options.fullWindow )
        targetdiv.node().classList.add("full-page");

    options.setDrawingTableSplit( options.drawingTableSplit ); //shouln't cause a server update

    var focusDrawingObject = ! options.interactive ? undefined : function( d, scrollTable )
    {
        if (    ( d3.event) 
             && ( d3.event.originalTarget )
             && ( d3.event.originalTarget.className === "ps-ref" )
             && ( selectedObject == d )
             )
        {
            selectedObject = d.drawing.getObject( d3.event.originalTarget.innerHTML );
            scrollTable = true;
        }
        else if (    ( d3.event) 
                  && ( d3.event.srcElement )
                  && ( d3.event.srcElement.className === "ps-ref" )
                  && ( selectedObject == d )
             )
        {
            selectedObject = d.drawing.getObject( d3.event.srcElement.innerHTML );
            scrollTable = true;
        }
        else
        {
            selectedObject = d;
        }

        for( var j=0; j< pattern.drawings.length; j++ )
            for( var i=0; i< pattern.drawings[j].drawingObjects.length; i++ )
            {
                var a = pattern.drawings[j].drawingObjects[i];
                var g = a.drawingSvg;
                if ( g )
                {
                    var strokeWidth = a.getStrokeWidth( false, (selectedObject==a) );

                    g.selectAll( "line" )
                     .attr("stroke-width", strokeWidth );

                    g.selectAll( "path" )
                     .attr("stroke-width", strokeWidth );

                    g.selectAll( "ellipse" )
                     .attr("stroke-width", strokeWidth );
                }
                //else //this can happen e.g. because a group is hidden
                //    console.log("No drawing object for " + a.data.name );
            }        

        var graphdiv = targetdiv;
        //Remove any existing highlighting in the table. 
        $(graphdiv.node()).find( ".j-active" ).removeClass("j-active").removeClass("j-active-2s");
        $(graphdiv.node()).find( ".source" ).removeClass("source");
        $(graphdiv.node()).find( ".target" ).removeClass("target");
        //$(graphdiv.node()).find( ".j-outline.j-outline-active" ).removeClass("j-outline-active");
        //$(this).addClass("j-active"); //highlight the object in the drawing

        //d, the drawing object we clicked on, has a direct reference to its representation in the table
        if ( selectedObject )
        {
            if ( selectedObject.tableSvg ) //should always be set unless there has been a problem
                selectedObject.tableSvg.node().classList.add("j-active");

            if ( selectedObject.drawingSvg )
                selectedObject.drawingSvg.node().classList.add("j-active");

            if ( selectedObject.outlineSvg )
            {
                selectedObject.outlineSvg.node().classList.add("j-active");
                var selectedObjectToAdjustAfter2Secs = selectedObject; //The user may have clicked on something else within 2 seconds
                //the blush will only last 2 seconds anyway, but if we don't do this then a second click whilst it is the active one doesn't repeat the blush
                setTimeout( function(){ selectedObjectToAdjustAfter2Secs.outlineSvg.node().classList.add("j-active-2s");}, 2000 );
            }
        }

        //Set the css class of all links to "link" "source link" or "target link" as appropriate.
        if ( linksGroup )
            linksGroup.selectAll("path.link") //rename .link to .dependency
            .attr("class", function( d ) {                         
                if ( d.source == selectedObject ) 
                {
                    d.target.tableSvg.node().classList.add("source");

                    if ( d.target.outlineSvg ) //if it errored this will be undefined
                        d.target.outlineSvg.node().classList.add("source");

                    //d.target.tableSvg.each( function() { $(this).addClass("source"); } );
                    return "source link";
                }
                if ( d.target == selectedObject ) 
                {
                    d.source.tableSvg.node().classList.add("target");

                    if ( d.source.outlineSvg ) //if it errored this will be undefined
                        d.source.outlineSvg.node().classList.add("target");

                    //d.source.tableSvg.each( function() { $(this).addClass("target"); } );
                    return "target link";
                }
                return "link"; 
            } )
            .each( function( d ) { 
                if (( d.source == selectedObject ) || ( d.target == selectedObject ))
                    d3.select(this).raise();
             } );

        //Scroll the table to ensure that d.tableSvg is in view.    
        if (( scrollTable ) && ( selectedObject ))
        {
            if ( selectedObject.tableSvg )
            {
                var table = d3.select("div.pattern-table");
                table.transition()
                     .duration(500)
                     .tween("uniquetweenname", scrollTopTween( selectedObject.tableSvg.node().__data__.tableSvgY - ( table.node().getBoundingClientRect().height /2) ));
            }
            else
                console.log( "Cannot scroll table, no tableSvg - " + selectedObject.data.name );
        }
    };

    var controls;
    if (( ! options.hideControls ) && ( options.interactive ))
        controls = doControls( targetdiv, options, pattern );

    var drawingAndTableDiv = targetdiv.append("div");
    
    if ( ! options.thumbnail ) 
        drawingAndTableDiv.attr("class", "pattern-main")

    doDrawingAndTable = function( retainFocus ) {
                                    if ( options.layoutConfig.drawingWidth )
                                        doDrawing( drawingAndTableDiv, pattern, options, contextMenu, controls, focusDrawingObject );
                                    else
                                        drawingAndTableDiv.select("svg.pattern-drawing").remove();
                                                                            
                                    if (   ( options.layoutConfig.drawingWidth )
                                        && ( options.layoutConfig.tableWidth ) )
                                        doResizeBar( drawingAndTableDiv, options );    
                                    else
                                        drawingAndTableDiv.select("div.pattern-editor-resize").remove();

                                    if ( options.layoutConfig.tableWidth )
                                        doTable( drawingAndTableDiv, pattern, options, contextMenu, focusDrawingObject );
                                    else
                                        drawingAndTableDiv.select("div.pattern-table").remove();

                                    if ( retainFocus )
                                        //e.g. if doing show/hide functions button
                                        focusDrawingObject( selectedObject, true );
                                };

    doDrawingAndTable();                   
    
    if (( options.returnSVG !== undefined ) && ( options.returnID ))
    {
        var serializer = new XMLSerializer();
        var xmlString = serializer.serializeToString( targetdiv.select('svg.pattern-drawing').node());        
        var thisHash = CryptoJS.MD5( xmlString ).toString();
        if ( options.currentSVGhash !== thisHash )
        {
            var kvpSet = newkvpSet(true);
            kvpSet.add( 'svg', xmlString );
            kvpSet.add( 'id', options.returnID ) ;
            goGraph( options.interactionPrefix + ':' + options.returnSVG, fakeEvent(), kvpSet);
        }
        else
        {
            console.log("Current thumbnail is still valid.");
        }
    }

    if ( ! options.interactive )
        return;

    var errorFound = false;
    var firstDrawingObject;
    for( var j=0; j< pattern.drawings.length; j++ )
    {
        for( var i=0; i< pattern.drawings[j].drawingObjects.length; i++ )
        {
            var a = pattern.drawings[j].drawingObjects[i];

            if (( firstDrawingObject === undefined ) && ( a.isVisible( options ) ))
                firstDrawingObject = a;

            if ( a.error )
            {
                focusDrawingObject(a, true);
                errorFound = true;
                break;
            }
        }
        if ( errorFound )
            break;
    }

    //if not focussing on an error then see if there is a recently edited item to focus on. 
    if ( ! errorFound )
    {
        if ( options.focus ) 
        {
            var a = pattern.getObject( options.focus );

            if ( ! a )
            try {
                a = pattern.getMeasurement( options.focus );
            } catch (e){
            }

            if ( ! a )
                a = pattern.getVariable( options.focus );

            if ( a )
                focusDrawingObject(a, true);
        }
        else
        {
            focusDrawingObject(firstDrawingObject, true);
        }
    }
}


function doResizeBar( graphdiv, editorOptions )
{
    var layoutConfig = editorOptions.layoutConfig;
    var drag = d3.drag()
    .on("start", function(r) {
        console.log("dragStart");
        var rg = d3.select(this);        
        r.initialX = d3.event.x;
        r.resizeBarBaseStyle = rg.attr("style");
    })
    .on("drag", function(r) {
        console.log("drag");
        var rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle + " left:" + ( d3.event.x - r.initialX ) + "px;" ); 
    })
    .on("end", function(r){
        console.log("dragEnd: " + d3.event.x + " (" + ( d3.event.x - r.initialX ) + ")" );
        console.log( "layoutConfig:" + layoutConfig ); 
        var rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle ); 
        var newDrawingWidth = layoutConfig.drawingWidth + ( d3.event.x - r.initialX );
        var newTableWidth  = layoutConfig.tableWidth - ( d3.event.x - r.initialX );
        editorOptions.setDrawingTableSplit( newDrawingWidth / ( newDrawingWidth + newTableWidth) );
        doDrawingAndTable();
    });

    var layoutConfig = editorOptions.layoutConfig;
    var height = layoutConfig.drawingHeight;

    graphdiv.select( "div.pattern-editor-resize" ).remove();
    graphdiv.selectAll( "div.pattern-editor-resize" )
            .data( [ editorOptions ] )
            .enter()
            .append("div")
            .attr("class", "pattern-editor-resize")
            .attr("style", "height:" + height + "px;" )
            .call( drag );
}


function doControls( graphdiv, editorOptions, pattern )
{
    if ( ! editorOptions )
        return;

    var controls = graphdiv.append("div").attr("class", "pattern-editor-controls")

    if (    ( editorOptions.viewOption )
         && ( typeof editorOptions.viewOption === "object" ) //allow viewOption="drawing" to prevent display if these buttons
         && ( editorOptions.viewOption.length > 1 ) )
    {
        editorOptions.sizeButtons = controls.append("div").attr("class", "btn-group view-options");
        editorOptions.sizeButtons.selectAll("button")
                    .data( editorOptions.viewOption )
                    .enter()
                    .append("button")
                    .attr( "class",  function(d) { return d.mode == editorOptions.drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } )
                    .html(function(d) { return '<i class="' + d.icon + '"></i>'; })
                    .on("click", function(d) {
                        d3.event.preventDefault();
                        editorOptions.setDrawingTableSplit( d.mode );
                        doDrawingAndTable();
                        //$(this).parent().find("button").removeClass("btn-primary").addClass("btn-default");
                        //$(this).addClass("btn-primary");
                    } );
                    //TODO set the selected button to button-primary
    }

    if ( editorOptions.includeFullPageOption )
    {
        var toggleFullScreen = function() {
            d3.event.preventDefault();

            if ( graphdiv.classed("full-page") ) 
            {
                graphdiv.node().classList.remove("full-page");
                editorOptions.fullWindow = false;
            }
            else
            {
                graphdiv.node().classList.add("full-page");
                editorOptions.fullWindow = true;
            }

            editorOptions.setDrawingTableSplit();

            if ( editorOptions.updateServer ) 
                editorOptions.updateServer();

            doDrawingAndTable();
        };

        var fullPageButton = controls.append("button")
                                     .attr("class", "btn btn-default toggle-full-page")
                                     .html( '<i class="icon-fullscreen" />' )
                                     .attr("title","Toggle full screen")
                                     .on("click", toggleFullScreen );
    }

    //Zoom to fit. 
    if ( editorOptions.allowPanAndZoom )
    {
        var zoomToFitButton = controls.append("button")
                                     .attr("class", "btn btn-default zoom-to-fit")
                                     .html( '<i class="icon-move" />' )
                                     .attr("title","Zoom to fit");
                                     //.on("click", zoomToFit );
    }    

    if ( editorOptions.downloadOption )
    {
        var downloadFunction = function() {
            var serializer = new XMLSerializer();
            var xmlString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n" + serializer.serializeToString( graphdiv.select("svg.pattern-drawing").node() );
            //var imgData = 'data:image/svg+xml;base64,\n' + btoa(xmlString);
            var imgData = 'data:image/svg+xml;charset=utf-8,\n' + encodeURIComponent(xmlString);
            

            d3.select(this)
                          .attr( "href-lang", "image/svg+xml; charset=utf-8" )
                          .attr( "href", imgData )
                          .attr( "download", pattern.patternNumberAndName +  ( editorOptions.targetPiece.name ? " - " + editorOptions.targetPiece.name : "" ) + " " + pattern.getDate() + ".svg" );
        };

        var downloadLink = controls.append("a")
                                     .attr("class", "btn btn-default download")
                                     .html( '<i class="icon-download"></i> Download' )
                                     .attr("title","Download")
                                     .on("click", downloadFunction );
    }    

    if ( editorOptions.interactive )
    {
        var toggleShowFormulas = function() {
            d3.event.preventDefault();
            editorOptions.showFormulas = ! editorOptions.showFormulas;
            $(this).children("i").attr("class",editorOptions.showFormulas ? "icon-check" : "icon-check-empty" );
            doDrawingAndTable( true /*retain focus*/ );
        };

        var optionMenuToggle = function() {
            d3.event.preventDefault();
            var $optionMenu = $( "#optionMenu");
            if ( $optionMenu.is(":visible")) $optionMenu.hide(); else $optionMenu.show();
        }

        var optionMenu = controls.append("div").attr("class","pattern-popup")
                                 .append("div").attr("id","optionMenu" ); //.css("display","visible")
        optionMenu.append("button").html( '<i class="icon-remove"></i>' ).on("click", optionMenuToggle );

        pattern.drawings.forEach( function(pp) {
            if ( ! pp.groups.length )
                return;
            var groupOptionsForPiece = optionMenu.append("section");
            groupOptionsForPiece.append("h2").text( pp.name );
            pp.groups.forEach( function(g) {
                var groupOption = groupOptionsForPiece.append("div").attr("class","group-option");
                var toggleGroup = function() {
                    g.visible = ! g.visible;  

                    if(( typeof goGraph === "function" ) && ( g.update ))
                    {
                        var kvpSet = newkvpSet(true) ;
                        kvpSet.add('visible', g.visible ) ;
                        goGraph(editorOptions.interactionPrefix + ':' + g.update, fakeEvent(), kvpSet) ;    
                    }

                    return g.visible;
                };
                groupOption.append( "i" ).attr("class",  g.visible ? 'icon-eye-open' :'icon-eye-close' )
                           .on( "click", function() { 
                                            d3.event.preventDefault();
                                            var visible = toggleGroup();
                                            d3.select(this).attr("class",visible ? "icon-eye-open" : "icon-eye-close" );
                                            doDrawingAndTable( true /*retain focus*/ );
                                } );
                groupOption.append( 'span' )
                           .text(g.name );
                if (( g.contextMenu ) && ( typeof goGraph === "function" ))
                groupOption.append( "i" ).attr("class",  "icon-ellipsis-horizontal k-icon-button" )           
                           .on( "click", function() { 
                            d3.event.preventDefault();
                            var v = newkvpSet(false) ;
                            goGraph( editorOptions.interactionPrefix + ':' + g.contextMenu, d3.event, v );
                            } );
            });
        });

        optionMenu.append("div").attr("class","formula-option").html( '<i class="icon-check"></i>show formulas' ).on("click", toggleShowFormulas );

        if ( ! ( editorOptions.targetPiece && editorOptions.lifeSize ) ) //&& ! downloadOption ? 
            controls.append("button")
                    .attr("class","btn btn-default toggle-options").html( '<i class="icon-adjust"></i>' )
                    .attr("title","Group/formula visibility").on("click", optionMenuToggle );
    } //options menu to show/hide groups and show/hide formula

    if ( pattern.wallpapers )
    {
        initialiseWallpapers( pattern, editorOptions.interactionPrefix );

        var wallpaperMenuToggle = function() {
            d3.event.preventDefault();
            var $wallpaperMenu = $( "#wallpapersMenu");
            if ( $wallpaperMenu.is(":visible")) $wallpaperMenu.hide(); else $wallpaperMenu.show();
        }

        var wallpaperMenu = controls.append("div").attr("class","pattern-popup")
                                    .append("div").attr("id","wallpapersMenu" ); 
        wallpaperMenu.append("button").html( '<i class="icon-remove"></i>' ).on("click", wallpaperMenuToggle );
            
        var wallpaperListSection = wallpaperMenu.append("section");
        wallpaperListSection.append("h2").text( "Wallpapers" );
        wallpaperListSection = wallpaperListSection.append("ul");
        wallpaperListSection.selectAll("li")
            .data( pattern.wallpapers )
            .enter()
            .append("li")
            .attr( "class", function(w) { return w.hide ? 'wallpaper-hidden' : null; } )
            .each( function(wallpaper,i){                
                var wallpaperDiv = d3.select(this);

                
                wallpaperDiv.append( "span" ).html( function(w) { return w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      w.hide = ! w.hide; 
                                                                      d3.select(this).html( w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' );
                                                                      d3.select(this.parentNode).attr( "class", w.hide ? 'wallpaper-hidden' : null );
                                                                      w.updateServer();
                                                                      var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                      doWallpapers( wallpaperGroups, pattern );                                                              
                                                                     } );
                wallpaperDiv.append( "span" ).html( function(w) { return w.editable ? '<i class="icon-unlock"/>' : w.allowEdit ? '<i class="icon-lock"/>' : '<i class="icon-lock disabled"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      if ( w.allowEdit )
                                                                      {
                                                                        w.editable = ! w.editable; 
                                                                        d3.select(this).html( w.editable ? '<i class="icon-unlock"/>' : '<i class="icon-lock"/>' );
                                                                        var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                        doWallpapers( wallpaperGroups, pattern );                                                              
                                                                      }
                                                                     } );
                wallpaperDiv.append( "span" ).text( wallpaper.filename ? wallpaper.filename : wallpaper.imageurl );
                                                                     //icon-lock icon-unlock icon-move icon-eye-open icon-eye-close
            });            

        controls.append("button").attr("class","btn btn-default toggle-options").html( '<i class="icon-camera-retro"></i>' ).attr("title","Wallpapers").on("click", wallpaperMenuToggle );
    } //wallpapers button    

    return controls;
}


function initialiseWallpapers( pattern, interactionPrefix )
{    
    var updateServer = ( typeof goGraph === "function" ) ? function(e) {
        var kvpSet = newkvpSet(true) ;
        kvpSet.add('offsetX', this.offsetX ) ;
        kvpSet.add('offsetY', this.offsetY ) ;
        kvpSet.add('scaleX', this.scaleX * defaultScale ) ;
        kvpSet.add('scaleY', this.scaleY * defaultScale ) ;
        kvpSet.add('opacity', this.opacity ) ;
        kvpSet.add('visible', ! this.hide ) ;
        goGraph(interactionPrefix + ':' + this.update, fakeEvent(), kvpSet) ;    
    } : function(e){};

    var wallpapers = pattern.wallpapers; 
    for( var i=0; i<wallpapers.length; i++ )
    {
        var w = wallpapers[i];

        if ( ! w.initialised )
        {
            //A 720px image is naturally 10in (at 72dpi)
            //If our pattern as 10in across then our image should be 10 units.
            //If our pattern was 10cm across then our image should be 25.4 units and we would expect to need to specify a scale of 1/2.54
            var defaultScale = 72;
            if ( pattern.units === "cm" )
            {
                defaultScale = 72 / 2.54;
            }
            else if ( pattern.units === "mm" )
            {
                defaultScale = 72 / 25.4;
            }
            w.scaleX = w.scaleX / defaultScale /*dpi*/; //And adjust by pattern.units
            w.scaleY = w.scaleY / defaultScale /*dpi*/;
            w.hide = ( w.visible !== undefined ) && (! w.visible );
            w.allowEdit = ( w.allowEdit === undefined ) || ( w.allowEdit );
            
            //w.dimensionsKnown = dimensionsKnown;
            $("<img/>") // Make in memory copy of image to avoid css issues
                .attr("src", w.imageurl )
                .attr("data-wallpaper", i)
                .on( "load", function() {
                    //seems like we can't rely on closure to pass w in, it always   points to the final wallpaper
                    w = wallpapers[ this.dataset.wallpaper ];
                    w.width = this.width;   // Note: $(this).width() will not
                    w.height = this.height; // work for in memory images.
                    //console.log( "jquery Image loaded w.imageurl " + w.imageurl + " width:" + w.width + " height:" + w.height);
                    //console.log( "Wallpaper dimensions known. Image loaded w.imageurl width:" + w.width + " height:" + w.height );
                    if ( w.image )
                    {
                        //console.log( " setting d3Image dimentions." );
                        d3.select( w.image ).attr("width", w.width );        
                        d3.select( w.image ).attr("height", w.height );        
                    }
                });
                
            if ( updateServer )
                w.updateServer = updateServer;

            w.initialised = true;
        }    
    }
}


//http://bl.ocks.org/humbletim/5507619
function scrollTopTween(scrollTop) 
{
    return function() {
        var i = d3.interpolateNumber(this.scrollTop, scrollTop);
        //console.log( "function1: ", this.scrollTop, " - ", scrollTop );
        return function(t) { 
            this.scrollTop = i(t); 
            //console.log( "function2: ", this.scrollTop );
        };
    }
}
  

//Do the drawing... (we've added draw() to each drawing object.
function doDrawing( graphdiv, pattern, editorOptions, contextMenu, controls, focusDrawingObject )
{
    var layoutConfig = editorOptions.layoutConfig;
    var margin = editorOptions.lifeSize ? pattern.getPatternEquivalentOfMM(5) : 0;
    if ( margin )
    {
        pattern.visibleBounds.minX = Math.round( ( pattern.visibleBounds.minX - margin ) * 1000 ) / 1000;
        pattern.visibleBounds.minY = Math.round( ( pattern.visibleBounds.minY - margin ) * 1000 ) / 1000;
        pattern.visibleBounds.maxX = Math.round( ( pattern.visibleBounds.maxX + margin ) * 1000 ) / 1000;
        pattern.visibleBounds.maxY = Math.round( ( pattern.visibleBounds.maxY + margin ) * 1000 ) / 1000;
    }
    var width =  layoutConfig.drawingWidth;
    var height = layoutConfig.drawingHeight;
    var patternWidth = pattern.visibleBounds.maxX - pattern.visibleBounds.minX;
    var patternHeight = pattern.visibleBounds.maxY - pattern.visibleBounds.minY;

    graphdiv.select("svg.pattern-drawing").remove();

    var svg;
    
    if ( editorOptions.lifeSize )
    {
        //The margin needs to at least be 0.5 * strokewidth so tha that strokes arnt clipped. 
        var margin = pattern.getPatternEquivalentOfMM(5);
        patternWidth = Math.round( ( patternWidth + margin ) * 1000 ) / 1000;
        patternHeight = Math.round( ( patternHeight + margin ) * 1000 ) / 1000;
        svg = graphdiv.append("svg")
                      .attr("class", "pattern-drawing" )
                      .attr("viewBox", pattern.visibleBounds.minX + " " + pattern.visibleBounds.minY + " " + patternWidth + " " + patternHeight );

        if ( editorOptions.lifeSize )
        {
            svg.attr("width", patternWidth + pattern.units )
               .attr("height", patternHeight + pattern.units );
        }                      
    }
    else
    {
        svg = graphdiv.append("svg")
                       .attr("class", "pattern-drawing" )
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

        if ( editorOptions.thumbnail )
            svg.attr("viewBox", 0 + " " + 0 + " " + (width + ( 2 * margin )) + " " + (height + ( 2 * margin )) );
    }

    var transformGroup1 = svg.append("g"); //This gets used by d3.zoom

    //console.log( "Pattern bounds minX:" + pattern.bounds.minX + " maxX:" + pattern.bounds.maxX );
    //console.log( "Pattern bounds minY:" + pattern.bounds.minY + " maxY:" + pattern.bounds.maxY );

    //transformGroup2 scales from calculated positions in pattern-space (e.g. 10 representing 10cm) to
    //pixels available. So 10cm in a 500px drawing has a scale of 50. 
    var transformGroup2;

    if ( editorOptions.lifeSize )// || ( editorOptions.thumbnail ))
    {
        scale = 1;
        transformGroup2 = transformGroup1; //we don't need another group
    }
    else
    {
        var scaleX = width / patternWidth;                   
        var scaleY = height / patternHeight;           
        
        if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
            scale = scaleX > scaleY ? scaleY : scaleX;
        else if ( isFinite( scaleX ) )
            scale = scaleX;
        else
            scale = 1;

        transformGroup2 = transformGroup2 = transformGroup1.append("g").attr("transform", "scale(" + scale + "," + scale + ")");
    }

    //console.log( "scale:" + scale + " patternWidth:" + patternWidth + " width:" + width );

    //centralise horizontally                            
    var boundsWidth = pattern.visibleBounds.maxX - pattern.visibleBounds.minX;
    var availableWidth = width / scale;
    var offSetX = ( availableWidth - boundsWidth ) /2;

    //transformGroup3 shifts the position of the pattern, so that it is centered in the available space. 
    var transformGroup3 = transformGroup2.append("g")                               
                                         .attr("class", editorOptions.thumbnail ? "pattern thumbnail" : "pattern");                           

    if ( editorOptions.downloadOption )  
        transformGroup3.attr("id", pattern.patternNumberAndName )
        
    if ( ! editorOptions.lifeSize )
        transformGroup3.attr("transform", "translate(" + ( ( -1.0 * ( pattern.visibleBounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.visibleBounds.minY ) ) + ")");    

    if ( pattern.wallpapers )
    {
        var wallpaperGroups = transformGroup2.append("g")
                                             .attr("class","wallpapers")
                                             .attr("transform", "translate(" + ( ( -1.0 * ( pattern.visibleBounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.visibleBounds.minY ) ) + ")")   
                                             .lower();
        doWallpapers( wallpaperGroups, pattern );
    }
     
    //Clicking on an object in the drawing should highlight it in the table.
    var onclick = ! editorOptions.interactive ? undefined : function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,true);
    };

    for( var j=0; j< pattern.drawings.length; j++ )
    {
        var drawing = pattern.drawings[j];

        var skipDrawing = editorOptions.skipDrawing;

        if ( ! skipDrawing )
        {
            var outlineGroup = ! editorOptions.interactive ? undefined : transformGroup3.append("g").attr("class","j-outline");
            var drawingGroup = transformGroup3.append("g").attr("class","j-drawing");

            if ( editorOptions.interactive )
            {
                const drawingOptions = { "outline": false, 
                                         "label": (! editorOptions.hideLabels),
                                         "dot":  (! editorOptions.hideLabels) };
                var a = drawingGroup.selectAll("g");    
                a = a.data( drawing.drawingObjects );
                a.enter()
                .append("g")
                .on("contextmenu", contextMenu)
                .on("click", onclick)
                .on('touchstart', function() { 
                    this.touchStartTime = new Date(); 
                    if ( event ) event.preventDefault();
                })
                .on('touchend',function(d) {    
                    const endTime = new Date(); 
                    const duration = endTime - this.touchStartTime;
                    if ( event ) event.preventDefault();
                    if (( duration > 400) || ( selectedObject === d ))
                    { 
                        //console.log("long touch, " + (duration) + " milliseconds long");
                        contextMenu(d);
                    }
                    else {
                        //console.log("regular touch, " + (duration) + " milliseconds long");
                        onclick(d);
                    }                    
                })
                .each( function(d,i) {
                    var g = d3.select( this );                        
                    if (   ( typeof d.draw === "function" ) 
                        && ( ! d.error )
                        && ( d.isVisible( editorOptions ) ) )
                    try {
                        d.draw( g, drawingOptions );
                        d.drawingSvg = g;                 
                    } catch ( e ) {
                        d.error = "Drawing failed. " + e;
                    }
                });
            }
            else //thumbnail
            {
                //In order to have the minimum SVG then don't create a group for each drawing object. 
                const drawingOptions = { "outline": false, 
                                         "label": (! editorOptions.hideLabels),
                                         "dot":  (! editorOptions.hideLabels) };
                drawingGroup.selectAll("g")
                    .data( drawing.drawingObjects )
                    .enter()
                    .each( function(d,i) {
                    var g = d3.select( this );                        
                    if (   ( typeof d.draw === "function" ) 
                        && ( ! d.error )
                        && ( d.isVisible( editorOptions ) ) )
                    try {
                        d.draw( g, drawingOptions );
                    } catch ( e ) {
                        d.error = "Drawing failed. " + e;
                    }
                });
            }

            if ( outlineGroup )
            {
                outlineGroup.selectAll("g") 
                .data( drawing.drawingObjects )
                .enter()
                .append("g")
                .on("contextmenu", contextMenu)
                .on("click", onclick)
                .on('touchstart', function() { 
                    this.touchStartTime = new Date(); 
                    if ( event ) event.preventDefault();
                })
                .on('touchend',function(d) {    
                    const endTime = new Date(); 
                    const duration = endTime - this.touchStartTime;
                    if ( event ) event.preventDefault();
                    if (( duration > 400) || ( selectedObject === d ))
                    { 
                        //console.log("long touch, " + (duration) + " milliseconds long");
                        contextMenu(d);
                    }
                    else {
                        //console.log("regular touch, " + (duration) + " milliseconds long");
                        onclick(d);
                    }                    
                })                
                .each( function(d,i) {
                    var g = d3.select( this );
                    if (   ( typeof d.draw === "function" ) 
                        && ( ! d.error )
                        && ( d.isVisible( editorOptions ) ) )
                    {
                        d.draw( g, { "outline": true, "label": false, "dot":true } );
                        d.outlineSvg = g;
                    }
                });
            }
        }

        if ( ! editorOptions.skipPieces )
        {
            var pieceGroup = transformGroup3.append("g").attr("class","j-pieces");
            var pg = pieceGroup.selectAll("g");    
            pg = pg.data( drawing.pieces );
            pg.enter()
            .append("g")        
            //.on("contextmenu", contextMenu)
            //.on("click", onclick)
            .each( function(p,i) {
                var g = d3.select( this );
                g.attr("id", p.name );

                //if doing an export of multiple pieces then take the piece.mx/my into account
                if ( editorOptions.targetPiece === "all" ) //OR AN ARRAY WITH >1 length
                {
                    g.attr("transform", "translate(" + ( 1.0 * p.data.mx ) + "," +  (1.0 * p.data.my ) + ")");    
                }

                if (   ( typeof p.drawSeamLine === "function" ) )
                {
                    const simplify = ( editorOptions.thumbnail ) && ( editorOptions.targetPiece === "all" );
                    const useExportStyles = editorOptions.downloadOption;

                    p.drawSeamAllowance( g, useExportStyles ); //do this first as it is bigger and we want it underneath in case we fill 
                    p.drawSeamLine( g, useExportStyles );
                    p.drawInternalPaths( g, useExportStyles );
                    if ( ! simplify )
                    {
                        p.drawNotches( g, useExportStyles );
                        p.drawMarkings( g, useExportStyles );
                    }
                    p.svg = g;
                }
            });
        }
    };

    var updateServerAfterDelay = function()
    {
        //Lets only update the server if we've stopped panning and zooming for > 1s.
        timeOfLastTweak = (new Date()).getTime();
        if ( ! updateServerTimer )
        {
            var updateServerTimerExpired = function () {

                updateServerTimer = null;          
                //console.log("Zoom update server timer activated. TimeOfLastTweak:" + timeOfLastTweak + " Now:" + (new Date()).getTime());

                if ( (new Date()).getTime() >= ( timeOfLastTweak + 500 ) )
                {
                    var zt = d3.zoomTransform( transformGroup1.node() );
                    if ( editorOptions.updateServer )
                        editorOptions.updateServer( zt.k, zt.x, zt.y );
                }
                else
                    updateServerTimer = setTimeout(updateServerTimerExpired, 500);
            }

            updateServerTimer = setTimeout(updateServerTimerExpired, 500);
        }           
    };

    var zoomed = function() {
        transformGroup1.attr("transform", d3.event.transform);

        var currentScale = d3.zoomTransform( transformGroup1.node() ).k; //do we want to scale 1-10 to 1-5 for fonts and linewidths and dots?
        if (   ( currentScale > (1.1*fontsSizedForScale) )
            || ( currentScale < (0.9*fontsSizedForScale) )
            || ( currentScale == 1 ) || ( currentScale == 8 ) )
        {
            if ( ! fontResizeTimer )
            {
                fontResizeTimer = setTimeout(function () {      
                    fontResizeTimer = null;          
                    fontsSizedForScale = d3.zoomTransform( transformGroup1.node() ).k;
                    //console.log( "Resize for " + fontsSizedForScale);

                    for( var j=0; j< pattern.drawings.length; j++ )
                    {
                        var drawing = pattern.drawings[j];
                
                        for( var i=0; i< drawing.drawingObjects.length; i++ )
                        {
                            var a = drawing.drawingObjects[i];
                            var g = a.drawingSvg;                            
                            if ( g )
                            {
                                var labelPosition = a.labelPosition();

                                if ( labelPosition )
                                {
                                    g.selectAll( "text.labl" )
                                    .attr("font-size", labelPosition.fontSize + "px")
                                    .attr("x", labelPosition.labelX )
                                    .attr("y", labelPosition.labelY );

                                    g.selectAll( "line.labelLine" )
                                    .attr("x2", labelPosition.labelLineX )
                                    .attr("y2", labelPosition.labelLineY );
                                }

                                const fontSize = Math.round( 1300 / scale / fontsSizedForScale )/100;
                                g.selectAll( "text.length" )
                                 .attr("font-size", fontSize + "px");

                       
                                g.selectAll( "circle" )
                                .attr("r", Math.round(400 / scale / fontsSizedForScale)/100 );

                                {
                                    var strokeWidth = a.getStrokeWidth( false, (selectedObject==a) );

                                    g.selectAll( "line" )
                                        .attr( "stroke-width", strokeWidth );

                                    g.selectAll( "path" )
                                        .attr( "stroke-width", strokeWidth );            

                                    g.selectAll( "ellipse" )
                                        .attr( "stroke-width", strokeWidth );            
                                }
                            }

                            g = a.outlineSvg;
                            if ( g )
                            {
                                var strokeWidth = a.getStrokeWidth( true );

                                g.selectAll( "line" )
                                 .attr( "stroke-width", strokeWidth );

                                g.selectAll( "path" )
                                 .attr( "stroke-width", strokeWidth );           

                                g.selectAll( "ellipse" )
                                 .attr( "stroke-width", strokeWidth );           

                                g.selectAll( "circle" )
                                    .attr("r", Math.round( 1200 / scale / fontsSizedForScale )/100 );
                            }
                        }        

                        //TODO for each piece also scale their stroke width

                        
                    }
                }, 50);         
            }
        }
        updateServerAfterDelay();         
    };           

    fontsSizedForScale = 1; //the starting scale of transformGroup1.
    if ( editorOptions.allowPanAndZoom )
    {
        //TODO just the fontsize needs setting initially to take editorOptions.scale into account

        var transform = d3.zoomIdentity.translate(editorOptions.translateX, editorOptions.translateY).scale(editorOptions.scale);
        var zoom = d3.zoom()
                    .extent([[0, 0], [width, height]])
                    .scaleExtent([0.5, 32])
                    .on("zoom", zoomed);
        svg.call( zoom)
           .call(zoom.transform, transform);

        fontsSizedForScale = editorOptions.scale;

        if ( controls) 
        controls.select( ".zoom-to-fit" ).on( "click", function() 
        {
            d3.event.preventDefault();

            //Reset transformGroup1 to 0,0 and scale 1
            svg.call(zoom)
               .call(zoom.transform, d3.zoomIdentity);
            
            if ( editorOptions.updateServer )
            {
                var zt = d3.zoomTransform( transformGroup1.node() );
                editorOptions.updateServer( zt.k, zt.x, zt.y );
            }
        } );        
    }
}


function doWallpapers( wallpaperGroups, pattern )
{
    var visibleWallpapers = [];
    for( var i=0; i<pattern.wallpapers.length; i++ )
    {
        var w = pattern.wallpapers[i];

        if ( ! w.hide )
            visibleWallpapers.push( w );
    }

    var drag = d3.drag()
        .on("start", function(wallpaper) {
            //var wallpaperG = d3.select(this);
            //if ( ! wallpaper.editable )
            //    return;
            wallpaper.offsetXdragStart = wallpaper.offsetX - d3.event.x;
            wallpaper.offsetYdragStart = wallpaper.offsetY - d3.event.y;
        })
        .on("drag", function(wallpaper) {
            //if ( ! wallpaper.editable )
            //    return;
            var wallpaperG = d3.select(this);        
            wallpaper.offsetX = wallpaper.offsetXdragStart + d3.event.x;
            wallpaper.offsetY = wallpaper.offsetYdragStart + d3.event.y;
            wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
        })
        .on("end", function(wallpaper){
            wallpaper.updateServer( d3.event );
        });

    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers, function(d){return d.filename} )
                    //.filter(function(w){return !w.hide;})
                    .enter()
                    .append("g")
                    .attr( "class", function(w){ return w.editable ? "wallpaper editable" : "wallpaper" } )
                    .attr("transform", function(wallpaper) { return  "translate(" + ( wallpaper.offsetX ) + "," + ( wallpaper.offsetY ) + ")"
                                                                    + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + ")" } )
                    .append( "image" )
                    //.on( "load", function(w) {
                    //    console.log("d3 image loaded");
                    //})
                    .attr( "href", function(w) { return w.imageurl } )
                    .attr( "opacity", function(w) { return w.opacity } )
                    .each( function(w){
                        //Set this up so that we can later use dimensionsKnown()
                        console.log("** added d3 image and setting w.image width:" + w.width + " height:" + w.height );
                        w.image = this; 
                        //if we know the dimensions already, set them! (Safari needs this on showing a hidden wallpaper)
                        d3.select(this).attr( "width",w.width);
                        d3.select(this).attr( "height",w.height);
                    } );

    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers, function(d){return d.filename} )
                    .exit().remove();

    var resize = d3.drag()
                    .on("start", function(wallpaper) {
                        wallpaper.offsetXdragStart = d3.event.x - wallpaper.width;
                        wallpaper.offsetYdragStart = d3.event.y - wallpaper.height;
                        //console.log("start offsetXdragStart:" + wallpaper.offsetXdragStart );
                    })
                    .on("end", function(wallpaper) {
                        var wallpaperG = d3.select(this.parentNode);
                        var circle = d3.select(this);
                        var rect = wallpaperG.select("rect");
                        var ratio = circle.attr("cx") / wallpaper.width;     
                        var scaleXbefore = wallpaper.scaleX;                   
                        wallpaper.scaleX = wallpaper.scaleX * ratio; //fixed aspect?
                        wallpaper.scaleY = wallpaper.scaleY * ratio;
                        //console.log( "cx:" + circle.attr("cx") + " image:" + wallpaper.width + "  ratio:" + ratio + "  scaleXbefore:" + scaleXbefore + "  scaleXNow:" + wallpaper.scaleX );
                        wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
                        circle.attr("cx", wallpaper.width )
                              .attr("cy", wallpaper.height );
                        rect.attr("width", wallpaper.width )
                            .attr("height", wallpaper.height );
                        wallpaper.updateServer( d3.event );
                    } )
                    .on("drag", function(wallpaper) {
                        var wallpaperG = d3.select(this.parentNode);
                        var circle = d3.select(this);
                        var rect = wallpaperG.select("rect");
                        var newX = d3.event.x - wallpaper.offsetXdragStart;
                        var newY = d3.event.y - wallpaper.offsetYdragStart;
                        //console.log("drag d3.event.x:" + d3.event.x + "  newX:" + newX );
                        if ( true ) //fixed aspect
                        {
                            var ratioX = newX / wallpaper.width;
                            var ratioY = newY / wallpaper.height;
                            var ratio = (ratioX+ratioY)/2.0;
                            newX = ratio * wallpaper.width;
                            newY = ratio * wallpaper.height;
                        }
                        circle.attr("cx", newX )
                                .attr("cy", newY );
                        rect.attr("width", newX )
                            .attr("height", newY );
                    });

    //Add a resizing boundary to each editable wallpaper.                 
    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers,function(d){return d.filename} )
                    //.filter(function(w){return !w.hide;})
                    .each( function(w,i) {
                        var g = d3.select(this);
                        //This worked on Firefox and Chrome, but not Safari.
                        //var box = g.node().getBBox();
                        //w.width = box.width;
                        //w.height = box.height;

                        if ( w.editable )
                        {
                            g.append("rect")
                            .attr("x",0)
                            .attr("y",0)
                            .attr("stroke", "red")
                            .attr("fill", "none")
                            .attr("width", w.width)
                            .attr("height", w.height);
    
                            g.append( "circle") 
                            .attr("cx", function(w) { return w.width } )
                            .attr("cy", function(w) { return w.height } )
                            .attr("r", 10 / scale / w.scaleX / fontsSizedForScale )
                            .attr("fill", "red")
                            .call(resize);
                            
                            g.call(drag);
                        }
                        else
                        {
                            g.select("rect").remove();
                            g.select("circle").remove();
                            g.on(".drag", null );
                        }
                    } );
    //resize(wallpaperGroups.selectAll("g > circle"));            
}


function doTable( graphdiv, pattern, editorOptions, contextMenu, focusDrawingObject )
{
    var drawing1 = pattern.drawings[0];
    var layoutConfig = editorOptions.layoutConfig;
    var margin = layoutConfig.tableMargin;//25; 
    var width =  layoutConfig.tableWidth;//400;
    var height = layoutConfig.tableHeight;//600;
    var minItemHeight = 30; //should not be required
    var itemMargin = 8;
    var itemWidth = width *3/4;
    var ypos = 0;
    var seq = 1; //TODO get these in the XML as data?
    var asFormula = editorOptions.showFormulas; 

    var onclick = function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,false);
    }

    graphdiv.select("div.pattern-table").remove();

    var combinedObjects = [];

    //TODO ? a mode where we don't include measurements and variables in the table.
    if ( pattern.measurement )
    {
        for( var m in pattern.measurement )
            combinedObjects.push( pattern.measurement[m] );
    }

    if ( pattern.variable )
    {
        for( var i in pattern.variable )
            combinedObjects.push( pattern.variable[i] );
    }

    for( var j=0; j< pattern.drawings.length; j++ )
    {
        combinedObjects = combinedObjects.concat( pattern.drawings[j].drawingObjects);
    }

    const sanitiseForHTML = function ( s ) {
            return s.replace( /&/g, "&amp;" ).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        };

    var svg = graphdiv.append("div")
                      .attr("class", "pattern-table")
                      .style( "height", height +"px" )    
                      .append("svg")
                      .attr("width", width + ( 2 * margin ) )
                      .attr("height", minItemHeight * combinedObjects.length );    

    var a = svg.selectAll("g");
    a = a.data( combinedObjects );
    a.enter()        
    .append("g")
    .each( function(d,i) {

        var divHeight = function(that) {

            //this - the dom svg element
            //that - the data object

            var h = $(this).find( "div.outer" ).height();
            
            if ( h < minItemHeight )
                return minItemHeight;

            return h;
        };

        var g = d3.select( this );

        var classes = "j-item";

        if ( d.isMeasurement )
            classes += " j-measurement";
        else if ( d.isVariable )
            classes += " j-variable";
        else if ( ! d.isVisible( editorOptions ) ) //is a drawing object
            classes += " group-hidden"; //hidden because of groups

        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * minItemHeight );

        var fo = g.append( "foreignObject" )
        .attr( "x", 0 )
        .attr( "y", function (d) { 
             return ypos;
         } )
         .attr( "width", itemWidth  );

        var html;
        try {
            html = d.html( asFormula );
            if ( d.data && d.data.comments )
                html = '<div class="comments">' + sanitiseForHTML( d.data.comments ) + '</div>' + html;
            if (d.error)
                html += '<div class="error">' + sanitiseForHTML( d.error ) + '</div>' ;
        } catch ( e ) {
            html = '<div class="error">Failed to generate description.</div>';

            if ( ! d.error )
                d.error = "Failed to generate description.";

            html = '<div class="error">' + sanitiseForHTML( d.error ) + '</div>';
        }

        if ( d.error )
            classes += " error";

        g.attr( "class", classes ) ;    

         var div = fo.append( "xhtml:div" )
           .attr("class","outer")
           .append( "xhtml:div" )
           .attr("class","desc")
           .html( html );

        fo.attr( "height", 1 ); //required by firefox otherwise bounding rects returns nonsense
        fo.attr( "height", divHeight );

        g.attr( "height", divHeight )
        .attr( "y", function (d) { 
                                    //Get the height of the foreignObject.
                                    var h = this.childNodes[0].getBoundingClientRect().height;
                                    ypos += h + itemMargin; 
                                    //console.log("y: " + ypos );
                                    return ypos } )

        g.on("contextmenu", contextMenu)
         .on("click", onclick )
         .on('touchstart', function() { 
            this.touchStartTime = new Date(); 
            if ( event ) event.preventDefault();
         })
         .on('touchend',function(d) {    
            const endTime = new Date(); 
            const duration = endTime - this.touchStartTime;
            if ( event ) event.preventDefault();
            if (( duration > 400) || ( selectedObject === d ))
            { 
                //console.log("long touch, " + (duration) + " milliseconds long");
                contextMenu(d);
            }
            else {
                //console.log("regular touch, " + (duration) + " milliseconds long");
                onclick(d);
            }                    
         });
    }); //.each
        
    svg.attr("height", ypos );    

    linksGroup = svg.append("g")
                    .attr("class", "links");

    //Links area is width/4 by ypos.            
    var linkScale = (width/4) / Math.log( Math.abs( ypos /30 ) );   

    drawLinks( pattern, linkScale );
}


function drawLinks( pattern, linkScale ) {
    var linkData = pattern.dependencies.dependencies;
    
    linksGroup.selectAll("path.link") //rename .link to .dependency
                    .data(linkData)
                    .enter().append("path")
                    .attr("class", "link" )
                    .attr("d", function( link ) {
                        var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
                            x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;
                    
                        var dx = x0 - x1,
                            dy = y0 - y1,
                            l = Math.log( Math.abs(dy /30 ) ) * linkScale;
                    
                        var path = d3.path();
                        path.moveTo( x0, y0 );
                        path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
                        return path;                      
                    } );
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

    var path = d3.path();
    path.moveTo( x0, y0 );
    path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
    return path;                      
}

//TODO move to kinodbglue
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
            r += '&' + p + this.kvps[i].k + '=' + encodeURIComponent( this.kvps[i].v );
        }

        return r ;
    } ;

    if (noRefresh)
        kvp.add("_noRefresh", -1) ;

    return kvp ;
}

//TODO move to kinodbglue
function fakeEvent(location, x, y)
{
    var pXY = {x: 0, y: 0} ;
    
    if (location !== undefined)
    {
        pXY = getElementXY(location) ;
        pXY.x = Math.round(pXY.x + x) ;
        pXY.y = Math.round(pXY.y + y) ;
    }
    else
    {
        pXY.x = Math.round(x) ;
        pXY.y = Math.round(y) ;
    }
    
    // event to satisfy goGraph's requirements
    return { target: location, pageX: 0, pageY: 0, processedXY: pXY } ;
}


export{ PatternDrawing, doDrawing, doTable, drawPattern  };