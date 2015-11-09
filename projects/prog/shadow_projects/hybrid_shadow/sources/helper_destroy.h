#ifndef __HELPER_DESTROY_H__
#define __HELPER_DESTROY_H__

#include <Message.h>

void Viewer::destroyAll()
{
	destroyShaders();
	destroyTextures();
	destroyFrameBuffers();
	//
	destroyTriSoup();
	destroyVBO();
	//
	destroyTimerQueryNV();

	b_is_init = false;
}

void Viewer::destroyShaders()
{
	//Message::info( QString("# destroyShaders") );
	prog_vbo_sv0.destroy();
	prog_vbo_sv1.destroy();
	//
	prog_vbo.destroy();
	//
	prog_vbo_dsm.destroy();
	//
	prog_draw_texture.destroy();
	//
	prog_vbo_sv_geom.destroy();
        prog_vbo_smoothies_geom.destroy();
}

void Viewer::destroyTextures()
{
	//printf("# destroyTexturesForShadowMap\n");
	tex_shadow_map.destroy();
	tex_edges_map.destroy();
}

void Viewer::destroyFrameBuffers()
{
	//printf("# destroyFrameBufferForShadowMap\n");
		// - FrameBuffer pour rendre la Depth Shadow Map (render_to_depth_texture)
	fb_depth_shadow_map.destroy();
}

void Viewer::destroyTimerQueryNV()
{
    //printf("# destroyTimerQueryNV\n");
    tq_update_shadow_clip_map.destroy();
    tq_update_shadow_map.destroy();
}

void Viewer::destroyTriSoup()
{
	delete ts;
}

void Viewer::destroyVBO()
{
	delete vbo;
	delete indexBuffer;
	//
//	delete indexBuffer_sv;
//	delete vbo_sv;	 //[MOG: segfault quand on recharge]
}

#endif
