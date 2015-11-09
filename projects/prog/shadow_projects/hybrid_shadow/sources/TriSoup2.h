#ifndef __TRIP_SOUP2__
#define __TRIP_SOUP2__

#include <scene3d/TriSoup.h>
class Tri;
class TriSoupLoader;

class TriSoup2 : public TriSoup {
public:
    static TriSoup2* load(QString fileName, bool expand);
    
    void fitToUnitSphere();

protected:
    void expand();
    void freeMemory();

};

#endif
