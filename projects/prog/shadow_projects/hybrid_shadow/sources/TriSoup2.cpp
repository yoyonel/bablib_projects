#include "TriSoup2.h"
#include <scene3d/Tri.h>
#include <Message.h>

void TriSoup2::fitToUnitSphere() {
    for(int i=0; i<nv; i++) {
        vertex[i] = (vertex[i] - this->getCenter()) / this->getRadius();
    }
}

TriSoup2* TriSoup2::load(QString fileName, bool expand) {
	foreach(TriSoupLoader *loader, loaders) {
		if (fileName.endsWith("." + loader->suffix(), Qt::CaseInsensitive)) {
			    TriSoup2 *res = static_cast<TriSoup2*>(loader->load(fileName));
				res->infos();
			    if (res != NULL) res->postProcess();
			    if (expand && (res != NULL)) res->expand();		// explosion du mesh, nombre de vertex = nombre de face x 3 (chaque face poss�de des vertex uniques)
				res->infos();
			    return res;
		    }
	}
	Message::error(QString("format de fichier non support� : %1").arg(fileName));
	return NULL;
}

void TriSoup2::expand() {
  	TriSoup2 *res = static_cast<TriSoup2*>(new TriSoup(nt*3, nt, fileName));

  	int index_vertex = 0;

  	for(int i=0; i<nt; ++i) {
  		int* index = tri[i].index;
  		for(int j=0; j<3; ++j) {
  			res->vertex[index_vertex] 	= vertex[index[j]];
  			res->normal[index_vertex]	= normal[index[j]];
  			res->tri[i].index[j] 		= index_vertex;
  			++index_vertex;
  		}
  	}

  	freeMemory();

  	vertex 	= res->vertex;
  	tri 	= res->tri;
  	normal 	= res->normal;
  	//
  	nt 	= res->nt;
  	nv 	= res->nv;
}

void TriSoup2::freeMemory() {
  	delete[] vertex;
  	delete[] normal;
  	delete[] tri;
}
