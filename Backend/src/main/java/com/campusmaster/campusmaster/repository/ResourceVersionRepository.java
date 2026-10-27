package com.campusmaster.campusmaster.repository;

import com.campusmaster.campusmaster.entity.Resource;
import com.campusmaster.campusmaster.entity.ResourceVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceVersionRepository extends JpaRepository<ResourceVersion, Long> {
    List<ResourceVersion> findByResourceOrderByVersionNumberDesc(Resource resource);
}
