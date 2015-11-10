/****************************************************************************

Copyright (C) 2002-2007 Gilles Debunne (Gilles.Debunne@imag.fr)

This file is part of the QGLViewer library.
Version 2.2.6-3, released on August 28, 2007.

http://artis.imag.fr/Members/Gilles.Debunne/QGLViewer

libQGLViewer is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

libQGLViewer is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with libQGLViewer; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*****************************************************************************/

#include "viewer_shadow.h"
#include <ProjTransfo.h>
#include <Params.h>
#include <OpenGL.h>
#include "helpers.h"
#include <QKeyEvent>
#include <QGLViewer/manipulatedFrame.h>


Viewer::Viewer() : bFirstInit(true) { };

Viewer::~Viewer() {
	//@@ a faire
	destroyAll();

	fprintf(stdout, "\n");
}
    
void Viewer::init()
{	
	if (bFirstInit) {
		// - init GLEW
		OpenGL::init();
		fprintf(stdout, "Status: Using GLEW %s\n", glewGetString(GLEW_VERSION));

		// Restore previous viewer state.
		//restoreStateFromFile();

		// Set position of light's camera
		qgl_cam_light.setPosition( qglviewer::Vec(0, 50, 0) );
		qgl_cam_light.fitBoundingBox( qglviewer::Vec(-1, -1, -1), qglviewer::Vec(+1, +1, +1) );

		// Add a manipulated frame to the viewer.
		setManipulatedFrame( qgl_cam_light.frame() );
		
		setAnimationPeriod(0.);

		setSceneCenter(qglviewer::Vec(0, 0, 0));
        	setSceneRadius(10.f);

	}
	
	initAll( !bFirstInit );

	if (bFirstInit) {
		qgl_mf_vbo.setPosition( -qglviewer::Vec(ts->getCenter()) );
		f_scale_vbo = 1.f / ( ts->getRadius() );
	}

	bFirstInit = false;
	
	// On vérifie les erreurs
	MSG_CHECK_GL;
}

// Draw the scene
void Viewer::draw()
{
	// - update les FrameBuffers
	updateFrameBuffers();

	drawScene();	
	
	// Dessine la camera attaché à la lumière
	if (qgl_cam_light.frame()->isManipulated())
		drawLightCamera( 0.75f );
	else if ( PARAM(bool, light_camera.draw) ) 
		drawLightCamera();
	else
		drawLightCamera( PARAM(float, light_camera.coef_draw_default) );
	
	// - Debug: affiche les textures (depth shadow map, shadow clipmap, shadow contour)
	if ( PARAM(bool, draw_debug_textures) )
		drawTextures();	
}

void Viewer::keyPressEvent(QKeyEvent *e) {
	switch( e->key() ) { 
	case Qt::Key_P:
	    Params::reload();
	    updateGL();
	    break;
	case Qt::Key_L:
		Params::reload();
		init();
		updateGL();
        	break;
	case Qt::Key_E:
		setManipulatedFrame( qgl_cam_light.frame() );
		break;
	case Qt::Key_Z:
		setManipulatedFrame( &qgl_mf_vbo );
		break;	
	default:
		QGLViewer::keyPressEvent(e);
	}
}



