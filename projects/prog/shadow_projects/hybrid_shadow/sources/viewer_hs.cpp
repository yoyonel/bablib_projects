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

#include "viewer_hs.h"
#include <ProjTransfo.h>
#include <Params.h>
#include <OpenGL.h>
#include "helpers.h"
#include <QKeyEvent>

Viewer::Viewer() : bFirstInit(true) { };

Viewer::~Viewer() {
	//@@ a faire
	destroyAll();
}
    
void Viewer::init()
{	
	if (bFirstInit) {
		// - init GLEW
		OpenGL::init();
		fprintf(stdout, "## Status: Using GLEW %s\n", glewGetString(GLEW_VERSION));

		if (PARAM(bool, stencil_buffer.enable) )
		{
			glGetIntegerv(GL_STENCIL_BITS, &i_stencil_bits);
			i_init_stencil = 1<<(i_stencil_bits-1);
//			glClearStencil( 0x0 );
			glClearStencil( i_init_stencil );
			//
			fprintf(stdout, "## OGL Stencil Buffer Size: %d bits\n", i_stencil_bits);
			fprintf(stdout, "## OGL Stencil Buffer Init Value: %d\n", i_init_stencil);
		}

		// Restore previous viewer state.
//		restoreStateFromFile();
		
		setAnimationPeriod( 0. );
		//startAnimation();
		stopAnimation();

		setFPSIsDisplayed();
		setSceneCenter(qglviewer::Vec(0, 0, 0));
        	setSceneRadius(10.f);

		qgl_cam_light_mf.fitBoundingBox( qglviewer::Vec(-1, -1, -1), qglviewer::Vec(+1, +1, +1) );
//		qgl_cam_light_mf.frame()->setPosition( qglviewer::Vec(0, +1, 0) );

		// Add a manipulated frame to the viewer.
		setManipulatedFrame( qgl_cam_light_mf.frame() );

		setTextIsEnabled();
	}

	initAll( !bFirstInit );

	bFirstInit = false;
	
	// On vérifie les erreurs
	MSG_CHECK_GL;
}

// preDraw
void Viewer::preDraw()
{
	GLbitfield bf_buffers_to_be_cleared = GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT;
	bf_buffers_to_be_cleared |= PARAM(bool, stencil_buffer.enable) * GL_STENCIL_BUFFER_BIT;

	glClear( bf_buffers_to_be_cleared );

	camera()->loadProjectionMatrix();
	camera()->loadModelViewMatrix();
}

// Draw the scene
void Viewer::draw()
{	
	// - update les FrameBuffers
	updateFrameBuffers();
	
	drawScene();

	// Dessine la camera attaché �  la lumière
	if ( PARAM(bool, light_camera.draw) ) 
	{
		if (qgl_cam_light_mf.frame()->isManipulated())
			drawLightCamera( PARAM(float, light_camera.intensity_isManipulated) );
		else {
			drawLightCamera( PARAM(float, light_camera.intensity_isNotManipulated) );
		}

		glPushAttrib(GL_ALL_ATTRIB_BITS);
			glDisable(GL_LIGHTING);
			glDisable(GL_CULL_FACE);
			glEnable(GL_BLEND);
			glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
			glDepthMask( GL_FALSE );
			glEnable(GL_COLOR_MATERIAL);

			float f_coef_alpha = 0.4;
			Vec4 v4_light_diffuse_color(0.8, 0.9, 0.2, f_coef_alpha);

                        glLightfv( GL_LIGHT0, GL_DIFFUSE, v4_light_diffuse_color );

			float f_scale_light = 0.2f;
			drawLight(GL_LIGHT0, f_scale_light);
		glPopAttrib();
	}

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
	case Qt::Key_Z:
		setManipulatedFrame( &qgl_mf_vbo );
		break;
	case Qt::Key_E:
		setManipulatedFrame( qgl_cam_light_mf.frame() );
		break;
	case Qt::Key_R:
		Params::reload();
		initShaders( !bFirstInit );
		updateGL();
		break;
	default:
		QGLViewer::keyPressEvent(e);
	}
}



